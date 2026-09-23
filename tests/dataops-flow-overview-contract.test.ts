import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import type { Command, RuntimeContext } from '../src/framework/types.js';
import flowCommands from '../src/commands/te-dataops/flow/index.js';
import operationsCommands from '../src/commands/te-dataops/operations/index.js';
import { buildDataopsApiDryRun } from '../src/commands/te-dataops/shared.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';

const host = 'https://flow-overview.test';
const base = { spaceCode: 'demo', flowCode: 1001 };
const commands = [...flowCommands, ...operationsCommands];

function context(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] == null ? undefined : Number(values[name]),
    bool: (name) => values[name] === true,
    host: () => host,
  } as RuntimeContext;
}

function command(name: string): Command {
  const found = commands.find((item) => item.command === '+' + name);
  assert.ok(found, name + ' must be registered');
  return found;
}

test('retires the standalone task parameter command and transport mapping', () => {
  assert.ok(!commands.some((item) => item.command === '+get_task_params'));
  assert.throws(() => buildDataopsApiDryRun(context(base), 'flow_get_task_params', base), /mapping not found/);
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', 'src/index.ts', '--no-update-check', 'dataops_flow', '+get_task_params',
    '--spaceCode', 'demo', '--flowCode', '1001', '--taskCode', '2001', '--dry-run',
  ], { encoding: 'utf8', timeout: 30_000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command/i);
});

test('overview preserves flow selectors and DEV default or explicit environment routing', async () => {
  const cmd = command('get_flow_overview');
  for (const env of [undefined, 'DEV', 'PROD']) {
    const result = await cmd.dryRun!(context({ ...base, env }));
    assert.equal(result.method, 'GET');
    assert.equal(new URL(result.url).pathname, '/api/cli/dataops/v1/gaia/workflow/flow-overview');
    assert.deepEqual(result.params, env ? { ...base, env } : base);
  }
  const byName = await cmd.dryRun!(context({ spaceCode: 'demo', flowName: 'daily', env: 'PROD' }));
  assert.deepEqual(byName.params, { spaceCode: 'demo', flowName: 'daily', env: 'PROD' });
  const byCode = await cmd.dryRun!(context({ ...base, flowName: 'daily' }));
  assert.deepEqual(byCode.params, { ...base, flowName: 'daily' });
  assert.throws(() => cmd.validate!(context({ spaceCode: 'demo' })), /flowCode or --flowName/);
});

test('query help explains parameter locations, definition semantics, and permissions', () => {
  const overview = command('get_flow_overview').description;
  for (const field of ['flowParams', 'dag.tasks[].taskParams', 'dwWorkflowEdit', 'FLOW', 'SPACE', 'null', 'expression']) {
    assert.ok(overview.includes(field), field);
  }
  assert.match(overview, /DEV/);
  assert.match(overview, /PROD/);
  assert.match(command('get_flow_instance_detail').description, /flowInstance\.instanceParamMap/);
  assert.match(command('get_task_instance_detail').description, /log\.params/);
  for (const name of ['get_flow_instance_detail', 'get_task_instance_detail']) {
    assert.match(command(name).description, /dwOMInstanceView/);
  }
});

test('passes through environment parameter definitions, code-parsed references, and instance snapshots', async () => {
  const previousFetch = globalThis.fetch;
  clearCliToken(host);
  setCliTokenManual('flow-overview-contract-token', host);
  let response: unknown;
  const requests: { url: URL; init?: RequestInit }[] = [];
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/v1/ta/cli/token/renew')) return new Response(JSON.stringify({ return_code: 0 }));
    requests.push({ url: new URL(String(url)), init });
    return new Response(JSON.stringify({ returnCode: 0, data: response }));
  }) as typeof fetch;
  try {
    for (const env of ['DEV', 'PROD']) {
      response = {
        success: true, env, resolvedBy: 'flowCode', flow: { flowCode: 1001 },
        flowParams: [{ paramKey: 'p', paramValue: env === 'DEV' ? '${st}' : '${bd}', paramDataType: 'EXPRESSION' }],
        dag: { tasks: [{ taskCode: 2001, taskParams: [
          { paramKey: 'p', paramDataType: 'QUOTE', paramFrom: 'FLOW', paramValue: env === 'DEV' ? '${st}' : '${bd}' },
          { paramKey: 'space_date', paramDataType: 'QUOTE', paramFrom: 'SPACE', paramValue: '${bd}' },
          { paramKey: 'bd', paramDataType: 'QUOTE', paramFrom: 'SPACE', paramType: 'BUILT_IN', isBd: true },
          { paramKey: 'deleted', paramDataType: 'QUOTE', paramFrom: null, paramValue: null },
          { paramKey: 'missing_source', paramDataType: 'QUOTE' },
        ] }], relations: [] },
      };
      const actual = await command('get_flow_overview').execute(context({ ...base, env }));
      assert.equal(JSON.stringify(actual), JSON.stringify(response));
      assert.equal(requests.at(-1)!.url.searchParams.get('env'), env);
      assert.equal(requests.at(-1)!.url.searchParams.get('flowCode'), '1001');
    }
    response = { success: true, env: 'DEV', flowParams: [], dag: { tasks: [{ taskCode: 2001, taskParams: [] }], relations: [] } };
    assert.equal(JSON.stringify(await command('get_flow_overview').execute(context(base))), JSON.stringify(response));
    for (const instanceParamMap of [{ p: 'historical-value', bd: '2026-09-08' }, null, undefined]) {
      response = { flowInstance: { flowInstanceId: 3001, instanceParamMap }, tasks: [] };
      assert.equal(JSON.stringify(await command('get_flow_instance_detail').execute(context({ ...base, flowInstanceId: 3001 }))), JSON.stringify(response));
      assert.equal(requests.at(-1)!.url.pathname, '/api/cli/dataops/v1/gaia/operations/flow-instances/detail');
    }
    response = { success: true, log: { params: { p: 'historical-value' } } };
    assert.equal(JSON.stringify(await command('get_task_instance_detail').execute(context({ ...base, flowInstanceId: 3001, taskInstanceId: 4001, includeLog: true }))), JSON.stringify(response));
    assert.equal(requests.at(-1)!.url.searchParams.get('includeLog'), 'true');
    for (const request of requests) {
      assert.equal(request.init?.method, 'GET');
      assert.equal((request.init?.headers as Record<string, string>)['cli-token'], 'flow-overview-contract-token');
    }
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }
});
