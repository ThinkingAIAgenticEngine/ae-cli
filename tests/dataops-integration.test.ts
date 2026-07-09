/**
 * DataOps integration command tests.
 *
 * Run:
 *   npx tsx tests/dataops-integration.test.ts
 */

import assert from 'node:assert/strict';
import type { RuntimeContext } from '../src/framework/types.js';
import { callDataopsApi } from '../src/commands/te-dataops/shared.js';
import { addSyncSolution } from '../src/commands/te-dataops/integration/add-sync-solution.js';
import { getTableStructure } from '../src/commands/te-dataops/integration/get-table-structure.js';
import { getTaskInstanceDetail } from '../src/commands/te-dataops/operations/get-task-instance-detail.js';
import { clearToken, saveToken } from '../src/core/auth.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { PermissionError } from '../src/core/errors.js';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ok - ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stderr.write(`  FAIL - ${name}\n`);
    process.stderr.write(`        ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function ctx(values: Record<string, string>, hostUrl = 'http://example.test'): RuntimeContext {
  return {
    str: (name) => values[name] ?? '',
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined || values[name] === '' ? undefined : Number(values[name]),
    bool: () => false,
    json: () => undefined,
    api: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => hostUrl,
    mcpUrl: () => undefined,
    service: () => 'dataops_integration',
    out: () => undefined,
  };
}

console.log('dataops integration');

await test('get_table_structure exposes catalog flag', () => {
  assert.ok(getTableStructure.flags.some((flag) => flag.name === 'catalog'));
});

await test('add_sync_solution does not expose confirmed flag', () => {
  assert.ok(!addSyncSolution.flags.some((flag) => flag.name === 'confirmed'));
});

await test('add_sync_solution dry-run omits confirmed', () => {
  const dryRun = addSyncSolution.dryRun?.(ctx({
    spaceCode: 'cli',
    syncName: 'sync1',
    srcComponent: 'te_etl',
    srcDatasourceId: 'te_etl@TASK_ENGINE_TRINO',
    sinkComponent: 'ClickHouse',
    sinkDatasourceId: 'ds1',
    sourceConfig: '{"tableType":0}',
    sinkConfig: '{"database":"default"}',
  }));

  assert.ok(!('confirmed' in (dryRun?.body ?? {})));
});

await test('get_table_structure dry-run includes catalog query param', () => {
  const dryRun = getTableStructure.dryRun?.(ctx({
    spaceCode: 'cli',
    datasourceId: 'ds1',
    catalog: 'sxy_catalog',
    database: 'sxy_db',
    tablePath: 'm_user_day_serial_3',
    env: 'DEV',
  }));

  assert.equal(dryRun?.params.catalog, 'sxy_catalog');
  assert.match(dryRun?.url ?? '', /catalog=sxy_catalog/);
  assert.ok((dryRun?.url ?? '').includes('/api/cli/dataops/v1/gaia/integration/table-structure'));
});

await test('get_task_instance_detail dry-run includes taskInstanceId query param', () => {
  const dryRun = getTaskInstanceDetail.dryRun?.(ctx({
    spaceCode: 'jd_test',
    flowCode: '5051715320000',
    flowInstanceId: '434091',
    taskInstanceId: '123456',
  }));

  assert.ok(getTaskInstanceDetail.flags.some((flag) => flag.name === 'taskInstanceId'));
  assert.equal(dryRun?.params.taskInstanceId, 123456);
  assert.match(dryRun?.url ?? '', /taskInstanceId=123456/);
});

await test('callDataopsApi sends cli-token header without Authorization', async () => {
  const host = 'https://test-dataops-header.internal';
  clearCliToken(host);
  setCliTokenManual('cli-dataops-token', host);

  let capturedHeaders: Record<string, string> = {};
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeaders = init?.headers as Record<string, string>;
    return new Response(JSON.stringify({ returnCode: 0, data: [{ spaceCode: 'demo' }] }), { status: 200 });
  }) as typeof fetch;

  try {
    await callDataopsApi(ctx({}, host), 'repo_list_spaces');
    assert.equal(capturedHeaders['cli-token'], 'cli-dataops-token');
    assert.equal(capturedHeaders.Authorization, undefined);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('callDataopsApi treats 403 as PermissionError without retry', async () => {
  const host = 'https://test-dataops-403.internal';
  clearCliToken(host);
  setCliTokenManual('cli-denied-token', host);

  let callCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    callCount++;
    return new Response(JSON.stringify({ message: 'no permission for this space' }), { status: 403 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => callDataopsApi(ctx({}, host), 'repo_list_spaces'),
      (err: Error) => err instanceof PermissionError && /no permission/.test(err.message),
    );
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('callDataopsApi refreshes cli-token once on 401', async () => {
  const host = 'https://test-dataops-401.internal';
  clearCliToken(host);
  clearToken(host);
  setCliTokenManual('stale-dataops-token', host);
  saveToken('fake-access-token-for-dataops-401-test', host);

  let apiCallCount = 0;
  const seenTokens: string[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/ta/cli/token/generate')) {
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'fresh-dataops-token' } }), { status: 200 });
    }

    apiCallCount++;
    seenTokens.push(((init?.headers as Record<string, string>) ?? {})['cli-token'] ?? '');
    if (apiCallCount === 1) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }
    return new Response(JSON.stringify({ returnCode: 0, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await callDataopsApi(ctx({}, host), 'repo_list_spaces');
    assert.equal(apiCallCount, 2);
    assert.equal(seenTokens[0], 'stale-dataops-token');
    assert.equal(seenTokens[1], 'fresh-dataops-token');
    assert.equal(JSON.stringify(result), JSON.stringify({ ok: true }));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clearToken(host);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
