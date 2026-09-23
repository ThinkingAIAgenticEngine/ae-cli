import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Command, RuntimeContext } from '../src/framework/types.js';
import { runCommand } from '../src/framework/runner.js';
import datatableCommands, { recycleEntity, listRecycleBin, deleteRecycledEntity } from '../src/commands/te-dataops/datatable/index.js';
import { callDataopsFieldMutationApi } from '../src/commands/te-dataops/shared.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { CliApiError } from '../src/core/errors.js';

const host = 'https://entity-lifecycle.test';
const target = { spaceCode: 'demo', entityId: 'exact-entity-id', name: 'orders' };
const writes = [
  { command: recycleEntity, path: '/entities/recycle' },
  { command: deleteRecycledEntity, path: '/recycle-bin/delete' },
];

function context(values: Record<string, unknown> = target): RuntimeContext {
  const value = (key: string) => values[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())];
  return {
    str: (key) => String(value(key) ?? ''),
    optionalNum: (key) => value(key) === undefined ? undefined : Number(value(key)),
    host: () => host,
  } as RuntimeContext;
}

async function withResponse(data: unknown, run: (calls: { url: URL; init?: RequestInit }[]) => Promise<void>, status = 200) {
  const original = globalThis.fetch;
  const calls: { url: URL; init?: RequestInit }[] = [];
  setCliTokenManual('test-entity-lifecycle-token', host);
  globalThis.fetch = (async (url, init) => {
    if (new URL(String(url)).pathname === '/v1/ta/cli/token/renew') {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
    calls.push({ url: new URL(String(url)), init });
    return new Response(JSON.stringify(status === 200 ? { returnCode: 0, data } : data), { status });
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
    clearCliToken(host);
  }
}

async function run(command: Command, opts: Record<string, unknown>, dryRun = false) {
  const originalExit = process.exit;
  const originalOut = process.stdout.write;
  const originalErr = process.stderr.write;
  const exit = new Error('captured process exit');
  let code = 0;
  let stdout = '';
  let stderr = '';
  process.exit = ((value?: number) => { code = value ?? 0; throw exit; }) as typeof process.exit;
  process.stdout.write = ((chunk: unknown) => { stdout += String(chunk); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => { stderr += String(chunk); return true; }) as typeof process.stderr.write;
  try {
    await runCommand(command, opts, { host, format: 'json', validate: false, dryRun, yes: !dryRun });
  } catch (error) {
    if (error !== exit) throw error;
  } finally {
    process.exit = originalExit;
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  }
  return { code, stdout, stderr };
}

test('registers all lifecycle commands under datatable and preserves existing commands', () => {
  const added = [recycleEntity, listRecycleBin, deleteRecycledEntity];
  assert.deepEqual(added.map(({ service, resource, command }) => [service, resource, command]), [
    ['dataops_datatable', undefined, '+entity_recycle'],
    ['dataops_datatable', undefined, '+recycle_bin_list'],
    ['dataops_datatable', undefined, '+recycle_bin_delete'],
  ]);
  assert.equal(datatableCommands.length, 11);
  assert.ok(datatableCommands.every((command) => command.service === 'dataops_datatable'));
  for (const { command } of writes) {
    assert.equal(command.risk, 'high-risk-write');
    assert.deepEqual(command.flags.map(({ name, required }) => [name, required]), [
      ['spaceCode', true], ['entityId', true], ['name', true],
    ]);
  }
  assert.equal(listRecycleBin.risk, 'read');
  assert.ok(added.every((command) => command.flags.every((flag) => flag.desc)));
});

for (const { command, path } of writes) {
  test(`${command.command}: preview is semantic and execution keeps the same exact target`, async () => {
    for (const preview of [true, false]) {
      const payload = { status: 'SUCCESS', result: { success: true, outcome: preview ? 'PREVIEW' : 'CHANGED', entityId: target.entityId } };
      await withResponse(payload, async (calls) => {
        const result = await run(command, target, preview);
        assert.equal(result.code, 0, result.stderr);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].url.pathname, '/api/cli/dataops/v1/gaia/datatable' + path);
        assert.equal(calls[0].init?.method, 'POST');
        const headers = new Headers(calls[0].init?.headers);
        assert.equal(headers.get('cli-token'), 'test-entity-lifecycle-token');
        assert.equal(headers.has('Authorization'), false);
        assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { ...target, ...(preview ? { preview: true } : {}) });
        assert.deepEqual(JSON.parse(result.stdout).data, payload);
      });
    }
  });

  test(`${command.command}: missing or blank identity flags stop before transport`, async () => {
    await withResponse({}, async (calls) => {
      for (const key of ['spaceCode', 'entityId', 'name']) {
        for (const value of [undefined, '', '   ']) {
          const result = await run(command, { ...target, [key]: value });
          assert.equal(result.code, 1);
          assert.match(result.stderr, /validation/);
        }
      }
      assert.equal(calls.length, 0);
    });
  });

  test(`${command.command}: refusal without --yes never enters execution`, () => {
    const child = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check',
      'dataops_datatable', command.command, '--spaceCode', 'demo', '--entityId', 'exact-entity-id',
      '--name', 'orders', '--host', host], { input: 'n\n', encoding: 'utf8', timeout: 30_000 });
    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stderr, /high-risk-write/);
    assert.match(child.stderr, /Aborted/);
    assert.equal(child.stdout.trim(), '');
  });

  for (const outcome of ['FAILED', 'PARTIAL']) {
    test(`${command.command}: ${outcome} preserves structured failure and never retries`, async () => {
      const diff = { before: { DEV: 'ACTIVE' }, after: { DEV: 'RECYCLED' } };
      await withResponse({ status: 'FAILED', action: command.command, result: {
        success: false, outcome, errorType: 'RECYCLE_NAME_CONFLICT', message: 'An old recycled entity exists.',
        hint: 'Inspect the recycle bin and explicitly delete the old entity first.', diff,
      } }, async (calls) => {
        const result = await run(command, target);
        assert.equal(result.code, 1);
        const envelope = JSON.parse(result.stderr);
        const error = envelope.error;
        assert.equal(error.type, 'api');
        assert.equal(error.code, 'RECYCLE_NAME_CONFLICT');
        assert.equal(envelope.meta.outcome, outcome);
        assert.deepEqual(envelope.meta.diff, diff);
        assert.match(error.hint, /explicitly delete/);
        assert.equal(calls.length, 1);
      });
    });
  }
}

test('unchanged preserves its reason and invalid semantic preview is a nonzero failure', async () => {
  await withResponse({ status: 'SUCCESS', result: { success: true, outcome: 'UNCHANGED', message: 'The entity is already recycled.' } }, async () => {
    const result = await run(recycleEntity, target);
    assert.equal(result.code, 0);
    assert.equal(JSON.parse(result.stdout).data.result.message, 'The entity is already recycled.');
  });
  await withResponse({ status: 'FAILED', result: { success: false, outcome: 'FAILED', errorType: 'NOT_FOUND', message: 'Entity not found.' } }, async (calls) => {
    const result = await run(deleteRecycledEntity, target, true);
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'NOT_FOUND');
    assert.equal(calls.length, 1);
    assert.equal(JSON.parse(String(calls[0].init?.body)).preview, true);
  });
});

test('recycle-bin list uses GET, leaves default to server, and preserves same-name identities', async () => {
  const payload = { entities: [
    { entityId: 'first', name: 'orders', entityType: 'TABLE', environments: ['DEV'], recycleTime: 1 },
    { entityId: 'second', name: 'orders', entityType: 'VIEW', environments: ['DEV', 'PRODUCT'], recycleTime: 2 },
  ], totalCount: 3, returnedCount: 2, hasMore: true };
  for (const optional of [{}, { search: 'orders', maxResults: 1000 }]) {
    await withResponse(payload, async (calls) => {
      const result = await run(listRecycleBin, { spaceCode: 'demo', ...optional });
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout).data, payload);
      assert.equal(calls[0].init?.method, 'GET');
      assert.equal(calls[0].init?.body, undefined);
      assert.equal(calls[0].url.pathname, '/api/cli/dataops/v1/gaia/datatable/recycle-bin');
      assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), Object.fromEntries(
        Object.entries({ spaceCode: 'demo', ...optional }).map(([key, value]) => [key, String(value)]),
      ));
    });
  }
});

test('recycle-bin list rejects non-integer and out-of-range limits before transport', async () => {
  await withResponse({}, async (calls) => {
    for (const maxResults of [0, -1, 1001, 1.5, 'abc']) {
      assert.equal((await run(listRecycleBin, { spaceCode: 'demo', maxResults })).code, 1);
    }
    assert.equal(calls.length, 0);
  });
});

test('permission rejection does not retry or fall back to another target', async () => {
  await withResponse({ message: 'Permission denied.' }, async (calls) => {
    const result = await run(deleteRecycledEntity, target);
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.stderr).error.type, 'permission');
    assert.equal(calls.length, 1);
  }, 403);
});

test('the shared mutation adapter retains the field-specific fallback message', async () => {
  await withResponse({ status: 'FAILED', result: { success: false } }, async () => {
    await assert.rejects(() => callDataopsFieldMutationApi(context(), 'datatable_delete_table_field', {}),
      (error: unknown) => error instanceof CliApiError && error.message === 'DataOps table field mutation failed.');
  });
});

test('help and reference document the three new commands and deletion boundary', async () => {
  for (const command of [recycleEntity, listRecycleBin, deleteRecycledEntity]) {
    const child = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check',
      'dataops_datatable', command.command, '--help'], { encoding: 'utf8', timeout: 30_000 });
    assert.equal(child.status, 0, child.stderr);
    for (const flag of command.flags) assert.ok(child.stdout.includes('--' + flag.name));
  }
  const reference = await readFile(new URL('../skills/ae-dataops/references/dataops-table.md', import.meta.url), 'utf8');
  for (const name of ['dataops_datatable +entity_recycle', 'dataops_datatable +recycle_bin_list', 'dataops_datatable +recycle_bin_delete']) {
    assert.ok(reference.includes(name));
  }
  assert.match(reference, /RECYCLE_NAME_CONFLICT/);
  assert.match(reference, /DEV and PRODUCT/);
  assert.match(reference, /Transition status: transitional/);
  assert.match(reference, /never.*automatically/i);
  for (const command of datatableCommands) {
    const line = reference.split('\n').find((entry) => entry.startsWith('|') && entry.includes(`ae-cli dataops_datatable ${command.command}`));
    assert.ok(line?.includes(`| ${command.risk} |`));
  }
});
