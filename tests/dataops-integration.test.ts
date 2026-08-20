/**
 * DataOps integration command tests.
 *
 * Run:
 *   npx tsx tests/dataops-integration.test.ts
 */

import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { Command, RuntimeContext } from '../src/framework/types.js';
import { callDataopsApi, downloadDataopsApi } from '../src/commands/te-dataops/shared.js';
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

await test('get_sql_query_status streams the download with cli-token', async () => {
  const host = 'https://test-dataops-download.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-'));
  const targetFile = join(targetDir, 'result.zip');
  const targetArg = relative(process.cwd(), targetFile);
  const chunks = [Buffer.from('zip-'), Buffer.from('result')];
  const expected = Buffer.concat(chunks);
  await writeFile(targetFile, 'old-result');
  clearCliToken(host);
  setCliTokenManual('cli-download-token', host);

  let accessTokenCalls = 0;
  let arrayBufferCalls = 0;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  let execution: Promise<unknown> | undefined;
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
    const response = new Response(new ReadableStream({
      start(controller) {
        streamController = controller;
        controller.enqueue(chunks[0]);
      },
    }), { status: 200 });
    Object.defineProperty(response, 'arrayBuffer', {
      value: async () => {
        arrayBufferCalls++;
        throw new Error('download must not use arrayBuffer');
      },
    });
    return response;
  }) as typeof fetch;

  try {
    execution = getSqlQueryStatus.execute(ctx({
      spaceCode: 'test_ly',
      downloadTaskId: '40',
      downloadTo: targetArg,
    }, host, async () => {
      accessTokenCalls++;
      throw new Error('access token must not be requested');
    }));

    let partialFile: string | undefined;
    for (let i = 0; i < 100 && !partialFile; i++) {
      const names = (await readdir(targetDir)).filter((name) => name.includes('.part-'));
      if (names.length === 1
        && (await readFile(join(targetDir, names[0]))).equals(chunks[0])) {
        partialFile = names[0];
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.ok(partialFile, 'first response chunk should be written before the stream completes');
    assert.equal((await readFile(targetFile)).toString(), 'old-result');

    streamController?.enqueue(chunks[1]);
    streamController?.close();
    streamController = undefined;
    const result = await execution;

    assert.equal(accessTokenCalls, 0);
    assert.equal(arrayBufferCalls, 0);
    assert.equal((result as any).localFile, targetFile);
    assert.deepEqual(await readFile(targetFile), expected);
    assert.match(requestUrls[1], /\/api\/cli\/dataops\/v1\/gaia\/ide\/sql-query-download/);
    assert.match(requestUrls[1], /spaceCode=test_ly/);
    assert.match(requestUrls[1], /taskId=40/);
    assert.equal(requestHeaders[1]['cli-token'], 'cli-download-token');
    assert.equal(requestHeaders[1]['X-Source'], 'ae-cli');
    assert.equal(requestHeaders[1].Accept, '*/*');
    assert.equal(requestHeaders[1].Authorization, undefined);
    assert.deepEqual((await readdir(targetDir)).filter((name) => name.includes('.part-')), []);
  } finally {
    streamController?.error(new Error('test cleanup'));
    await execution?.catch(() => undefined);
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

await test('get_sql_query_status keeps the existing target when the stream fails', async () => {
  const host = 'https://test-dataops-download-failure.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-failure-'));
  const targetFile = join(targetDir, 'result.zip');
  const existing = Buffer.from('existing-result');
  await writeFile(targetFile, existing);
  clearCliToken(host);
  setCliTokenManual('cli-download-token', host);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    if (String(url).includes('/sql-query-status')) {
      return new Response(JSON.stringify({
        returnCode: 0,
        data: {
          downloadStatus: 'SUCCESS',
          downloadParams: { spaceCode: 'test_ly', taskId: 40 },
        },
      }), { status: 200 });
    }
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from('partial'));
        controller.error(new Error('download stream failed'));
      },
    }), { status: 200 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => getSqlQueryStatus.execute(ctx({
        spaceCode: 'test_ly',
        downloadTaskId: '40',
        downloadTo: targetFile,
      }, host)),
      /download stream failed/,
    );
    assert.deepEqual(await readFile(targetFile), existing);
    assert.deepEqual((await readdir(targetDir)).filter((name) => name.includes('.part-')), []);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

await test('get_sql_query_status keeps the existing target when the response has no body', async () => {
  const host = 'https://test-dataops-download-empty.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-empty-'));
  const targetFile = join(targetDir, 'result.zip');
  const existing = Buffer.from('existing-result');
  await writeFile(targetFile, existing);
  clearCliToken(host);
  setCliTokenManual('cli-download-token', host);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    if (String(url).includes('/sql-query-status')) {
      return new Response(JSON.stringify({
        returnCode: 0,
        data: {
          downloadStatus: 'SUCCESS',
          downloadParams: { spaceCode: 'test_ly', taskId: 40 },
        },
      }), { status: 200 });
    }
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => getSqlQueryStatus.execute(ctx({
        spaceCode: 'test_ly',
        downloadTaskId: '40',
        downloadTo: targetFile,
      }, host)),
      /no body/,
    );
    assert.deepEqual(await readFile(targetFile), existing);
    assert.deepEqual((await readdir(targetDir)).filter((name) => name.includes('.part-')), []);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

await test('downloadDataopsApi refreshes cli-token once on 401', async () => {
  const host = 'https://test-dataops-download-401.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-401-'));
  const targetFile = join(targetDir, 'result.zip');
  clearCliToken(host);
  clearSecureToken(host);
  setCliTokenManual('stale-download-token', host);
  saveSecureToken(host, {
    accessToken: 'fake-access-token-for-download-401-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  let downloadCalls = 0;
  const seenTokens: string[] = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/v1/ta/cli/token/generate')) {
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'fresh-download-token' } }), { status: 200 });
    }
    downloadCalls++;
    seenTokens.push(((init?.headers as Record<string, string>) ?? {})['cli-token'] ?? '');
    if (downloadCalls === 1) return new Response('Unauthorized', { status: 401 });
    return new Response('zip-result', { status: 200 });
  }) as typeof fetch;

  try {
    const localFile = await downloadDataopsApi(ctx({}, host), '/download', {}, targetFile);
    assert.equal(localFile, targetFile);
    assert.equal(downloadCalls, 2);
    assert.deepEqual(seenTokens, ['stale-download-token', 'fresh-download-token']);
    assert.equal((await readFile(targetFile)).toString(), 'zip-result');
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    clearSecureToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

await test('downloadDataopsApi treats 403 as PermissionError without replacing the target', async () => {
  const host = 'https://test-dataops-download-403.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-403-'));
  const targetFile = join(targetDir, 'result.zip');
  const existing = Buffer.from('existing-result');
  await writeFile(targetFile, existing);
  clearCliToken(host);
  setCliTokenManual('denied-download-token', host);

  let callCount = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    callCount++;
    return new Response(JSON.stringify({ message: 'no permission for this download' }), { status: 403 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => downloadDataopsApi(ctx({}, host), '/download', {}, targetFile),
      (error: Error) => error instanceof PermissionError && /no permission/.test(error.message),
    );
    assert.equal(callCount, 1);
    assert.deepEqual(await readFile(targetFile), existing);
    assert.deepEqual((await readdir(targetDir)).filter((name) => name.includes('.part-')), []);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

await test('downloadDataopsApi preserves the HTTP error and existing target on 500', async () => {
  const host = 'https://test-dataops-download-500.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-500-'));
  const targetFile = join(targetDir, 'result.zip');
  const existing = Buffer.from('existing-result');
  await writeFile(targetFile, existing);
  clearCliToken(host);
  setCliTokenManual('failed-download-token', host);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ message: 'download failed' }),
    { status: 500, statusText: 'Internal Server Error' },
  )) as typeof fetch;

  try {
    await assert.rejects(
      () => downloadDataopsApi(ctx({}, host), '/download', {}, targetFile),
      /download failed/,
    );
    assert.deepEqual(await readFile(targetFile), existing);
    assert.deepEqual((await readdir(targetDir)).filter((name) => name.includes('.part-')), []);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

await test('downloadDataopsApi removes the partial file when publishing the target fails', async () => {
  const host = 'https://test-dataops-download-publish-failure.internal';
  const targetDir = await mkdtemp(join(tmpdir(), 'ae-cli-dataops-download-publish-failure-'));
  const targetPath = await mkdtemp(join(targetDir, 'result.zip-'));
  const sentinel = join(targetPath, 'sentinel');
  await writeFile(sentinel, 'keep-me');
  clearCliToken(host);
  setCliTokenManual('publish-failure-token', host);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('zip-result', { status: 200 })) as typeof fetch;

  try {
    await assert.rejects(
      () => downloadDataopsApi(ctx({}, host), '/download', {}, targetPath),
    );
    assert.equal((await readFile(sentinel)).toString(), 'keep-me');
    assert.deepEqual((await readdir(targetDir)).filter((name) => name.includes('.part-')), []);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
    await rm(targetDir, { recursive: true, force: true });
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
