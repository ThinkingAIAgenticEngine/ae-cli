/**
 * DataOps integration command tests.
 *
 * Run:
 *   npx tsx tests/dataops-integration.test.ts
 */

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command, RuntimeContext } from '../src/framework/types.js';
import { callDataopsApi } from '../src/commands/te-dataops/shared.js';
import { addSyncSolution } from '../src/commands/te-dataops/integration/add-sync-solution.js';
import { saveSyncSolution } from '../src/commands/te-dataops/integration/save-sync-solution.js';
import { getTableStructure } from '../src/commands/te-dataops/integration/get-table-structure.js';
import { getSqlQueryStatus } from '../src/commands/te-dataops/ide/get-sql-query-status.js';
import { getTaskInstanceDetail } from '../src/commands/te-dataops/operations/get-task-instance-detail.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { PermissionError } from '../src/core/errors.js';
import { clear as clearSecureToken, save as saveSecureToken } from '../src/core/secure-store.js';

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

function sourceConfigDescription(command: Command): string {
  return command.flags.find((flag) => flag.name === 'sourceConfig')?.desc ?? '';
}

function sinkConfigDescription(command: Command): string {
  return command.flags.find((flag) => flag.name === 'sinkConfig')?.desc ?? '';
}

function ctx(
  values: Record<string, string>,
  hostUrl = 'http://example.test',
  token: () => Promise<string> = async () => '',
): RuntimeContext {
  return {
    str: (name) => values[name] ?? '',
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined || values[name] === '' ? undefined : Number(values[name]),
    bool: () => false,
    json: () => undefined,
    api: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token,
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

await test('save_sync_solution allows omitted syncName', () => {
  const syncName = saveSyncSolution.flags.find((flag) => flag.name === 'syncName');

  assert.equal(syncName?.required, false);
  assert.equal(syncName?.desc, 'Ignored on update; the current name is preserved');
});

await test('dataops integration skill allows omitted syncName on save', async () => {
  const [skill, reference] = await Promise.all([
    readFile(new URL('../skills/ae-dataops/SKILL.md', import.meta.url), 'utf8'),
    readFile(new URL('../skills/ae-dataops/references/dataops-integration.md', import.meta.url), 'utf8'),
  ]);

  assert.match(skill, /save_sync_solution.*syncName.*accepted for compatibility but ignored/s);
  assert.match(reference, /save_sync_solution.*--syncId` `--sourceConfig` `--sinkConfig` `\[--syncName\]`/s);
  assert.match(reference, /syncName.*accepted for compatibility but ignored/);
});

await test('dataops integration skill distinguishes MySQL splitColumn from shardingKey', async () => {
  const [skill, reference] = await Promise.all([
    readFile(new URL('../skills/ae-dataops/SKILL.md', import.meta.url), 'utf8'),
    readFile(new URL('../skills/ae-dataops/references/dataops-integration.md', import.meta.url), 'utf8'),
  ]);

  for (const document of [skill, reference]) {
    assert.match(document, /`sourceConfig\.splitColumn`/);
    assert.match(document, /`fieldsMapping\.shardingKey` is column metadata and must not be used for it/);
  }
});

await test('save_sync_solution dry-run omits optional syncName', () => {
  const dryRun = saveSyncSolution.dryRun?.(ctx({
    spaceCode: 'default',
    syncId: 'sync-1',
    sourceConfig: '{"component":"MySQL"}',
    sinkConfig: '{"component":"te_etl"}',
  }));

  assert.ok(!('syncName' in (dryRun?.body ?? {})));
});

await test('sync solution commands keep source config descriptions concise', () => {
  assert.equal(
    sourceConfigDescription(addSyncSolution),
    'Source configuration JSON. Include component and follow the source-specific template in the ae-dataops integration skill',
  );
  assert.equal(
    sourceConfigDescription(saveSyncSolution),
    'Complete source configuration JSON. Include component and follow the source-specific template in the ae-dataops integration skill',
  );
});

await test('sync solution commands keep sink config descriptions concise', () => {
  assert.equal(
    sinkConfigDescription(addSyncSolution),
    'Sink configuration JSON. Include component and follow the sink-specific template in the ae-dataops integration skill',
  );
  assert.equal(
    sinkConfigDescription(saveSyncSolution),
    'Complete sink configuration JSON. Include component and follow the sink-specific template in the ae-dataops integration skill',
  );
});

await test('dataops integration reference contains all MySQL source templates', async () => {
  const reference = await readFile(
    new URL('../skills/ae-dataops/references/dataops-integration.md', import.meta.url),
    'utf8',
  );
  const template = (title: string): string => {
    const start = reference.indexOf(`### ${title}`);
    const end = reference.indexOf('### ', start + 1);
    return reference.slice(start, end === -1 ? reference.length : end);
  };
  const assertCommonFields = (source: string): void => {
    assert.match(source, /"component": "MySQL"/);
    assert.match(source, /"datasourceId": "ds-id"/);
    assert.match(source, /"batchSize": 1000/);
  };
  const tableWithoutFilter = template('MySQL table source without filter');
  const tableWithSplitColumn = template('MySQL table source with splitColumn');
  const tableWithWhereCondition = template('MySQL table source with whereCondition');
  const customQuery = template('MySQL custom query source');

  for (const tableTemplate of [tableWithoutFilter, tableWithSplitColumn, tableWithWhereCondition]) {
    assertCommonFields(tableTemplate);
    assert.match(tableTemplate, /"database": "demo"/);
    assert.match(tableTemplate, /"tablePath": "orders"/);
    assert.doesNotMatch(tableTemplate, /"query"/);
  }
  assert.doesNotMatch(tableWithoutFilter, /"whereCondition"/);
  assert.match(tableWithSplitColumn, /"splitColumn": "id"/);
  assert.match(tableWithWhereCondition, /"whereCondition": "WHERE created_at >= '2026-07-01'"/);
  assertCommonFields(customQuery);
  assert.match(customQuery, /"query": "SELECT id, amount FROM orders"/);
  assert.doesNotMatch(customQuery, /"database"|"tablePath"|"splitColumn"|"whereCondition"/);
  assert.match(reference, /readType.*1=table.*2=query/s);
  assert.match(reference, /hasCondition.*0=off.*1=on/s);
  assert.match(reference, /hasCondition=1.*non-empty `whereCondition`/s);
});

await test('dataops integration reference contains the MySQL sink target contract', async () => {
  const reference = await readFile(
    new URL('../skills/ae-dataops/references/dataops-integration.md', import.meta.url),
    'utf8',
  );
  const start = reference.indexOf('### MySQL sink target');
  const end = reference.indexOf('### ', start + 1);
  const mysqlTarget = reference.slice(start, end === -1 ? reference.length : end);

  assert.match(mysqlTarget, /"component": "MySQL"/);
  assert.match(mysqlTarget, /"datasourceId": "ds-id"/);
  assert.match(mysqlTarget, /"database": "demo"/);
  assert.match(mysqlTarget, /"tablePath": "orders"/);
  assert.match(mysqlTarget, /"dataSaveMode": 2/);
  assert.match(mysqlTarget, /"batchSize": 1000/);
  assert.match(mysqlTarget, /dataSaveMode.*JSON integer.*1=append.*2=overwrite.*3=upsert/s);
  assert.match(mysqlTarget, /default `2`/);
  assert.match(mysqlTarget, /batchSize.*JSON integer.*1000.*10000/s);
  assert.match(mysqlTarget, /default `1000`/);
  assert.match(mysqlTarget, /must not contain a\s+`query` key/);
  assert.doesNotMatch(mysqlTarget, /"query"/);
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
  clearSecureToken(host);
  setCliTokenManual('stale-dataops-token', host);
  saveSecureToken(host, {
    accessToken: 'fake-access-token-for-dataops-401-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

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
    clearSecureToken(host);
  }
});

await test('get_sql_query_status downloads with cli-token and never requests an access token', async () => {
  const host = 'https://test-dataops-download.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-'));
  const targetFile = join(targetDir, 'result.zip');
  const expected = Buffer.from('zip-result');
  clearCliToken(host);
  setCliTokenManual('cli-download-token', host);

  let accessTokenCalls = 0;
  const requestUrls: string[] = [];
  const requestHeaders: Record<string, string>[] = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    requestUrls.push(String(url));
    requestHeaders.push((init?.headers as Record<string, string>) ?? {});
    if (String(url).includes('/sql-query-status')) {
      return new Response(JSON.stringify({
        returnCode: 0,
        data: {
          downloadStatus: 'SUCCESS',
          downloadParams: { spaceCode: 'test_ly', taskId: 40 },
        },
      }), { status: 200 });
    }
    return new Response(expected, { status: 200 });
  }) as typeof fetch;

  try {
    const result = await getSqlQueryStatus.execute(ctx({
      spaceCode: 'test_ly',
      downloadTaskId: '40',
      downloadTo: targetFile,
    }, host, async () => {
      accessTokenCalls++;
      throw new Error('access token must not be requested');
    }));

    assert.equal(accessTokenCalls, 0);
    assert.equal((result as any).localFile, targetFile);
    assert.deepEqual(await readFile(targetFile), expected);
    assert.match(requestUrls[1], /\/api\/cli\/dataops\/v1\/gaia\/ide\/sql-query-download/);
    assert.match(requestUrls[1], /spaceCode=test_ly/);
    assert.match(requestUrls[1], /taskId=40/);
    assert.equal(requestHeaders[1]['cli-token'], 'cli-download-token');
    assert.equal(requestHeaders[1].Authorization, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
