import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Command, RuntimeContext } from '../src/framework/types.js';
import flowCommands from '../src/commands/te-dataops/flow/index.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../src/commands/te-dataops/shared.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';

const host = 'https://flow-params.test';
const base = { spaceCode: 'demo', flowCode: 1001, paramKey: 'run_date' };

function context(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    list: (name) => values[name] == null ? [] : [String(values[name])],
    host: () => host,
  } as RuntimeContext;
}

function command(name: string): Command {
  const found = flowCommands.find((item) => item.command === '+' + name);
  assert.ok(found, name + ' must be registered');
  return found;
}

async function preview(name: string, values: Record<string, unknown> = base) {
  const cmd = command(name);
  const ctx = context(values);
  cmd.validate?.(ctx);
  assert.ok(cmd.dryRun);
  return cmd.dryRun(ctx);
}

const runCli = (name: string, flags: string[], dryRun = true) => spawnSync(process.execPath, [
  '--import', 'tsx', 'src/index.ts', '--no-update-check', ...(dryRun ? ['--dry-run'] : []),
  'dataops_flow', '+' + name, '--host', host, ...flags,
], { encoding: 'utf8', timeout: 30_000 });

test('registers four typed commands with matching risks and no page-only fields', () => {
  for (const [name, risk] of [
    ['get_flow_params', 'read'], ['create_flow_param', 'write'],
    ['update_flow_param', 'write'], ['delete_flow_param', 'high-risk-write'],
  ]) {
    const cmd = command(name);
    assert.equal(cmd.risk, risk);
    assert.equal(cmd.service, 'dataops_flow');
    assert.ok(cmd.flags.every((flag) => flag.desc));
    assert.ok(!cmd.flags.some((flag) => flag.name === 'paramFormat'));
    assert.equal(cmd.flags.find((flag) => flag.name === 'flowCode')?.required, true);
    assert.equal(cmd.flags.find((flag) => flag.name === 'spaceCode')?.required, true);
    if (name !== 'get_flow_params') {
      assert.ok(!cmd.flags.some((flag) => flag.name === 'env'));
      assert.equal(cmd.flags.find((flag) => flag.name === 'paramKey')?.required, true);
    }
  }
});

test('query defaults DEV, accepts PROD, and maps GET parameters', async () => {
  for (const env of [undefined, 'DEV', 'PROD']) {
    const result = await preview('get_flow_params', { ...base, env });
    assert.equal(result.method, 'GET');
    assert.equal(new URL(result.url).pathname, '/api/cli/dataops/v1/gaia/workflow/flow-params');
    assert.deepEqual(result.params, { spaceCode: 'demo', flowCode: 1001, env: env ?? 'DEV' });
  }
  for (const env of ['', 'dev', 'TEST']) {
    await assert.rejects(() => preview('get_flow_params', { ...base, env }), /env/);
  }
});

test('create defaults VARCHAR and preserves expression and whitespace literals', async () => {
  for (const paramDataType of [undefined, 'VARCHAR', 'EXPRESSION']) {
    const paramValue = '  ${ws_run_date}  ';
    const result = await preview('create_flow_param', { ...base, paramValue, paramDataType, remark: 'note' });
    assert.equal(result.method, 'POST');
    assert.equal(new URL(result.url).pathname, '/api/cli/dataops/v1/gaia/workflow/flow-params');
    assert.deepEqual(result.body, { ...base, paramValue, paramDataType: paramDataType ?? 'VARCHAR', remark: 'note' });
  }
  assert.equal(command('create_flow_param').flags.find((flag) => flag.name === 'paramValue')?.required, true);
});

test('update preserves omitted and null fields while clearing an explicit empty remark', async () => {
  for (const values of [
    { ...base, paramValue: 'new' },
    { ...base, paramValue: 'new', paramDataType: null, remark: null, originParamKey: null },
  ]) {
    assert.deepEqual((await preview('update_flow_param', values)).body, { ...base, paramValue: 'new' });
  }
  const cleared = await preview('update_flow_param', { ...base, remark: '' });
  assert.equal(new URL(cleared.url).pathname, '/api/cli/dataops/v1/gaia/workflow/flow-param-definition');
  assert.deepEqual(cleared.body, { ...base, remark: '' });
});

test('update allows each field independently and supports rename without replacing the value', async () => {
  for (const fields of [
    { paramValue: '  new\nvalue  ' }, { paramDataType: 'VARCHAR' },
    { paramDataType: 'EXPRESSION' }, { remark: 'new note' }, { originParamKey: 'old_date' },
  ]) {
    assert.deepEqual((await preview('update_flow_param', { ...base, ...fields })).body, { ...base, ...fields });
  }
});

test('update rejects empty values and requires a field or actual rename', async () => {
  for (const fields of [{}, { originParamKey: base.paramKey }, { paramValue: null, remark: null }]) {
    await assert.rejects(() => preview('update_flow_param', { ...base, ...fields }), /at least one|rename/i);
  }
  await assert.rejects(() => preview('update_flow_param', { ...base, paramValue: '', remark: 'note' }), /paramValue/);
});

test('delete sends a single DEV parameter target', async () => {
  const result = await preview('delete_flow_param');
  assert.equal(result.method, 'POST');
  assert.equal(new URL(result.url).pathname, '/api/cli/dataops/v1/gaia/workflow/flow-param-deletion');
  assert.deepEqual(result.body, base);
});

test('all four commands reject missing spaces and invalid flow identifiers', async () => {
  for (const name of ['get_flow_params', 'create_flow_param', 'update_flow_param', 'delete_flow_param']) {
    for (const spaceCode of [undefined, '', '  ']) {
      await assert.rejects(() => preview(name, { ...base, paramValue: 'value', spaceCode }), /spaceCode/);
    }
    for (const flowCode of [undefined, 0, -1, 1.5, '1x', '1e3', Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(() => preview(name, { ...base, paramValue: 'value', flowCode }), /flowCode/);
    }
  }
});

test('validates custom parameter names at their boundaries, including rename origins', async () => {
  for (const paramKey of ['a', 'a'.repeat(40)]) {
    assert.equal((await preview('create_flow_param', { ...base, paramKey, paramValue: 'x' })).body.paramKey, paramKey);
  }
  for (const paramKey of [undefined, '', 'A', '_a', '1a', 'a-b', 'ws_date', 'env', 'a'.repeat(41), ' a ']) {
    for (const name of ['create_flow_param', 'update_flow_param', 'delete_flow_param']) {
      await assert.rejects(() => preview(name, { ...base, paramKey, paramValue: 'x' }), /paramKey/);
    }
  }
  for (const originParamKey of ['', 'env', 'ws_date', 'a'.repeat(41)]) {
    await assert.rejects(() => preview('update_flow_param', { ...base, originParamKey, paramValue: 'x' }), /originParamKey/);
  }
});

test('rejects unsupported types, empty create values, and overlong remarks', async () => {
  for (const name of ['create_flow_param', 'update_flow_param']) {
    for (const paramDataType of ['', 'varchar', 'NUMBER']) {
      await assert.rejects(() => preview(name, { ...base, paramValue: 'x', paramDataType }), /paramDataType/);
    }
    assert.equal((await preview(name, { ...base, paramValue: 'x', remark: 'a'.repeat(200) })).body.remark.length, 200);
    await assert.rejects(() => preview(name, { ...base, paramValue: 'x', remark: 'a'.repeat(201) }), /remark/);
  }
  for (const paramValue of [undefined, null, '']) {
    await assert.rejects(() => preview('create_flow_param', { ...base, paramValue }), /paramValue/);
  }
  assert.equal((await preview('create_flow_param', { ...base, paramValue: ' ' })).body.paramValue, ' ');
});

test('actual requests match previews, preserve empty remarks, and return the server payload', async () => {
  const previousFetch = globalThis.fetch;
  clearCliToken(host);
  setCliTokenManual('flow-params-contract-token', host);
  let response: unknown = [];
  const requests: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/v1/ta/cli/token/renew')) {
      return new Response(JSON.stringify({ return_code: 0 }));
    }
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ returnCode: 0, data: response }));
  }) as typeof fetch;
  try {
    for (const [name, values] of [
      ['get_flow_params', { ...base, env: 'PROD' }],
      ['create_flow_param', { ...base, paramValue: '  text  ' }],
      ['update_flow_param', { ...base, paramValue: '${ws_run_date}', paramDataType: 'EXPRESSION', remark: '' }],
      ['delete_flow_param', base],
    ] as const) {
      const expected = await preview(name, values);
      const ctx = context(values);
      response = name === 'get_flow_params'
        ? [{ flowCode: 1001, paramKey: 'run_date', paramValue: 'expression', paramDataType: 'EXPRESSION', remark: '', paramFormat: null, expQuoteKey: 'ws_run_date', expQuoteKeyFrom: 'SPACE' }]
        : { action: name, result: { paramKey: base.paramKey }, status: 'success' };
      assert.equal(JSON.stringify(await command(name).execute(ctx)), JSON.stringify(response));
      const actual = requests.at(-1)!;
      assert.equal(actual.url, expected.url);
      assert.equal(actual.init?.method, expected.method);
      assert.equal(actual.init?.body, expected.body ? JSON.stringify(expected.body) : undefined);
      const headers = actual.init?.headers as Record<string, string>;
      assert.equal(headers['cli-token'], 'flow-params-contract-token');
      assert.equal(headers.Authorization, undefined);
    }
    response = [];
    assert.deepEqual(await command('get_flow_params').execute(context(base)), []);
    const ctx = context({});
    const oldArgs = { ...base, remark: '', paramValue: '', absent: null };
    assert.deepEqual(buildDataopsApiDryRun(ctx, 'flow_update_flow', oldArgs).body, base);
    await callDataopsApi(ctx, 'flow_update_flow', oldArgs);
    assert.deepEqual(JSON.parse(String(requests.at(-1)!.init?.body)), base);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }
});

test('API business errors do not become successful command output', async () => {
  const previousFetch = globalThis.fetch;
  clearCliToken(host);
  setCliTokenManual('flow-params-error-token', host);
  globalThis.fetch = (async (url) => new Response(JSON.stringify(
    String(url).includes('/v1/ta/cli/token/renew') ? { return_code: 0 }
      : { returnCode: -1, returnMessage: 'Parameter already exists' },
  ))) as typeof fetch;
  try {
    await assert.rejects(() => command('create_flow_param').execute(context({ ...base, paramValue: 'x' })), /Parameter already exists/);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }
});

test('real CLI distinguishes omitted and empty flags and supports delete preview', () => {
  const flags = ['--spaceCode', 'demo', '--flowCode', '1001', '--paramKey', 'run_date'];
  for (const [extra, expected] of [
    [['--paramValue', 'new'], { ...base, paramValue: 'new' }],
    [['--remark', ''], { ...base, remark: '' }],
    [['--originParamKey', 'old_date'], { ...base, originParamKey: 'old_date' }],
  ] as const) {
    const result = runCli('update_flow_param', [...flags, ...extra]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data.body, expected);
  }
  for (const extra of [[], ['--paramValue', ''], ['--originParamKey', 'run_date']]) {
    const result = runCli('update_flow_param', [...flags, ...extra]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /"type":\s*"validation"/);
  }
  const missing = runCli('create_flow_param', flags);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /paramValue/);
  const deletion = runCli('delete_flow_param', flags);
  assert.equal(deletion.status, 0, deletion.stderr);
  assert.deepEqual(JSON.parse(deletion.stdout).data.body, base);
});

test('real CLI rejects an invalid delete target before confirmation or transport', () => {
  const result = runCli('delete_flow_param', [
    '--spaceCode', 'demo', '--flowCode', '0', '--paramKey', 'run_date',
  ], false);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /"type":\s*"validation"/);
  assert.match(result.stderr, /flowCode/);
  assert.doesNotMatch(result.stderr + result.stdout, /Continue\?|Aborted/);
});

test('skill documents parameter semantics and Transitional ownership', async () => {
  const reference = await readFile(new URL('../skills/ae-dataops/references/dataops-flow-create.md', import.meta.url), 'utf8');
  for (const name of ['get_flow_params', 'create_flow_param', 'update_flow_param', 'delete_flow_param']) {
    assert.ok(reference.includes('+' + name), name);
    assert.ok(reference.includes('flow_' + name), 'Transport ' + name);
  }
  for (const term of ['originParamKey', 'VARCHAR', 'EXPRESSION', '--remark ""', 'Transition status: transitional', 'Owning module:', 'Gateway target:', 'Review after:', 'Exit condition:']) {
    assert.ok(reference.includes(term), term);
  }
});
