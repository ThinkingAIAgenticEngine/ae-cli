import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = process.cwd();
const HOST = 'http://localhost';

const { registerCapabilityGatewayRoute } = await import(
  pathToFileURL(path.join(ROOT, 'src/core/capability-routing.ts')).href
);
registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
registerCapabilityGatewayRoute('analysis-meta', { gatewayDomain: 'analysis' });
registerCapabilityGatewayRoute('analysis-governance', { gatewayDomain: 'analysis' });

let pass = 0;
let fail = 0;

async function test(name, fn) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  OK ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  FAIL ${name}\n`);
    process.stdout.write(`    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function makeCtx(opts) {
  return {
    str(name) {
      return String(opts[camelCase(name)] ?? '');
    },
    num(name) {
      const val = opts[camelCase(name)];
      return val !== undefined ? Number(val) : 0;
    },
    optionalNum(name) {
      const val = opts[camelCase(name)];
      if (val === undefined || val === null || val === '') return undefined;
      return Number(val);
    },
    bool(name) {
      return Boolean(opts[camelCase(name)]);
    },
    json(name) {
      const val = opts[camelCase(name)];
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'object') return val;
      return JSON.parse(String(val));
    },
    host() {
      return HOST;
    },
    async token() {
      if (opts.failAccessToken) throw new Error('access token unavailable');
      return String(opts.token ?? 'cli-test-token');
    },
    mcpUrl() {
      return undefined;
    },
    service() {
      return 'metadata';
    },
  };
}

async function importCmd(relPath, exportName) {
  const mod = await import(pathToFileURL(path.join(ROOT, relPath)).href);
  return mod[exportName];
}

async function captureCapabilityDryRun(cmd, opts) {
  const { setCliTokenManual, clearCliToken } = await import(
    pathToFileURL(path.join(ROOT, 'src/core/cli-token.ts')).href
  );
  setCliTokenManual(String(opts.cliToken ?? 'cli-test-token'), HOST);
  let capturedUrl = '';
  let capturedBody;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  try {
    const result = await cmd.dryRun(makeCtx(opts));
    assert.equal(JSON.stringify(result), JSON.stringify({ dry_run: true }));
    return { url: capturedUrl, body: capturedBody };
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(HOST);
  }
}

async function captureCapabilityExecute(cmd, opts, responseData) {
  const { setCliTokenManual, clearCliToken } = await import(
    pathToFileURL(path.join(ROOT, 'src/core/cli-token.ts')).href
  );
  setCliTokenManual(String(opts.cliToken ?? 'cli-test-token'), HOST);
  let capturedUrl = '';
  let capturedBody;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: responseData, meta: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  try {
    const result = await cmd.execute(makeCtx(opts));
    return { url: capturedUrl, body: capturedBody, result };
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(HOST);
  }
}

async function captureCapabilityError(fn, responseBody) {
  const { setCliTokenManual, clearCliToken } = await import(
    pathToFileURL(path.join(ROOT, 'src/core/cli-token.ts')).href
  );
  setCliTokenManual('cli-test-token', HOST);
  let capturedUrl = '';
  let capturedBody;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  try {
    await assert.rejects(
      fn(),
      (err) => {
        assert.equal(err.code, responseBody.error.code);
        assert.equal(err.message, responseBody.error.message);
        return true;
      },
    );
    return { url: capturedUrl, body: capturedBody };
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(HOST);
  }
}

function runMcpDryRun(args) {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run', ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  return payload.data;
}

process.stdout.write('\nmetadata capability command tests\n');

await test('metadata data-table list maps to analysis gateway component', async () => {
  const cmd = await importCmd('src/commands/metadata/data-table/list.ts', 'dataTableList');
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1, limit: 100, offset: 200 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.list/dry-run`);
  assert.deepEqual(body, { input: { project_id: 1, limit: 100, offset: 200 } });
});

await test('analysis-meta datatable version-list sends shared pagination', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/datatable/version-list.ts',
    'metadataDataTableVersionList',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    datatableId: 9,
    limit: 50,
    offset: 50,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table_version.list/dry-run`);
  assert.deepEqual(body.input, { project_id: 1, datatable_id: 9, limit: 50, offset: 50 });
});

await test('analysis-meta datatable columns-get sends table_ref to gateway', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/datatable/columns-get.ts', 'metadataDataTableColumnsGet');
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1, tableRef: 'hive.ta.v_event_1' });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.columns_get/dry-run`);
  assert.deepEqual(body, { input: { project_id: 1, table_ref: 'hive.ta.v_event_1' } });
});

await test('analysis-meta event list sends search pagination projection and auth filter', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/event/list.ts', 'metadataEventList');
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'output'), false);
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    queries: ['login', 'sign in'],
    fields: ['event_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticatedOnly: true,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.event.list/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    queries: ['login', 'sign in'],
    fields: ['event_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticated_only: true,
  });
});

await test('analysis-meta event list normalizes backend events to the directory items contract', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/event/list.ts', 'metadataEventList');
  const { result } = await captureCapabilityExecute(cmd, {
    projectId: 1,
    limit: 20,
    offset: 0,
  }, {
    events: [{ event_name: 'login', event_desc: 'Login' }],
    total: 1,
    limit: 20,
    offset: 0,
    has_more: false,
    next_offset: null,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    items: [{ event_name: 'login', event_desc: 'Login' }],
    total: 1,
    limit: 20,
    offset: 0,
    has_more: false,
    next_offset: null,
  });
  assert.equal('events' in result, false);
});

await test('analysis-meta event export writes one complete private JSON file without leaking output path', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/event/export.ts', 'metadataEventExport');
  assert.equal(cmd.flags.find((flag) => flag.name === 'output')?.required, true);
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'limit'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'offset'), false);
  assert.throws(
    () => cmd.validate(makeCtx({ projectId: 1, output: '/tmp/events.jsonl' })),
    /--output must use the .json extension/,
  );
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-cli-event-catalog-'));
  const output = path.join(dir, 'events.json');
  try {
    const { body, result } = await captureCapabilityExecute(cmd, {
      projectId: 1,
      queries: ['pay', 'login'],
      fields: ['event_name'],
      output,
    }, {
      events: [
        { event_name: 'pay' },
        { event_name: 'login' },
      ],
      total: 2,
      complete: true,
    });
    assert.deepEqual(body.input, {
      project_id: 1,
      queries: ['pay', 'login'],
      fields: ['event_name'],
    });
    assert.equal(result.complete, true);
    assert.equal(result.row_count, 2);
    assert.equal(result.output_path, output);
    assert.equal(result.format, 'json');
    assert.match(result.content_sha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), [
      { event_name: 'pay' },
      { event_name: 'login' },
    ]);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert.deepEqual(await readdir(dir), ['events.json']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test('analysis-meta event export works with cli-token only and never requests an access token', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/event/export.ts', 'metadataEventExport');
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-cli-event-catalog-cli-token-'));
  const output = path.join(dir, 'events.json');
  try {
    const { result } = await captureCapabilityExecute(cmd, {
      projectId: 1,
      output,
      failAccessToken: true,
    }, {
      events: [{ event_name: 'pay' }],
      total: 1,
      complete: true,
    });

    assert.equal(result.complete, true);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), [{ event_name: 'pay' }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test('analysis-meta catalog full export fetches all analysis metadata in one capability call and one file', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/catalog/export.ts', 'metadataCatalogExport');
  const { setCliTokenManual, clearCliToken } = await import(
    pathToFileURL(path.join(ROOT, 'src/core/cli-token.ts')).href
  );
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-cli-analysis-catalog-'));
  const output = path.join(dir, 'catalog.jsonl');
  const previousFetch = globalThis.fetch;
  try {
    const rows = [
      { resource_type: 'event', resource_key: 'payment', display_name: '充值事件' },
      { resource_type: 'metric', resource_key: 'payer_count', display_name: '付费人数' },
      { resource_type: 'event_property', resource_key: 'amount', display_name: '充值金额' },
      { resource_type: 'user_property', resource_key: 'country', display_name: '国家' },
      { resource_type: 'cluster', resource_key: 'paid_users', display_name: '付费人群' },
      { resource_type: 'tag', resource_key: 'high_value', display_name: '高价值用户' },
    ];
    const artifact = `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
    let executeUrl = '';
    let executeBody;
    setCliTokenManual('cli-test-token', HOST);
    globalThis.fetch = (async (url, init) => {
      const value = String(url);
      if (value.endsWith('/capabilities/metadata.catalog.export/execute')) {
        executeUrl = value;
        executeBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          ok: true,
          data: {
            run_id: 'run_catalog',
            artifact_id: 'artifact_catalog',
            status: 'SUCCEEDED',
            artifact_status: 'COMPLETED',
          },
          meta: {},
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (value.endsWith('/runs/run_catalog/artifacts/artifact_catalog/download')) {
        return new Response(artifact, {
          status: 200,
          headers: { 'Content-Type': 'application/x-ndjson' },
        });
      }
      throw new Error(`Unexpected async catalog request: ${value}`);
    });
    const result = await cmd.execute(makeCtx({ projectId: 1, output }));

    assert.equal(executeUrl, `${HOST}/api/cli/analysis/v1/capabilities/metadata.catalog.export/execute`);
    assert.equal(executeBody.input.project_id, 1);
    assert.match(executeBody.input.request_id, /^cli_[a-f0-9]{32}$/);
    assert.equal(result.complete, true);
    assert.equal(result.row_count, 6);
    assert.equal((await readFile(output, 'utf8')).trim().split('\n').length, 6);
    assert.deepEqual(
      (await readFile(output, 'utf8')).trim().split('\n').map((line) => JSON.parse(line).resource_type),
      ['event', 'metric', 'event_property', 'user_property', 'cluster', 'tag'],
    );
    const sidecar = JSON.parse(await readFile(path.join(dir, 'catalog.meta.json'), 'utf8'));
    assert.equal(sidecar.complete, true);
    assert.equal(sidecar.row_count, 6);
    assert.equal(sidecar.run_id, 'run_catalog');
    assert.equal(sidecar.artifact_id, 'artifact_catalog');
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(HOST);
    await rm(dir, { recursive: true, force: true });
  }
});

await test('analysis-meta catalog export refuses an existing sidecar before remote submission', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/catalog/export.ts', 'metadataCatalogExport');
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-cli-analysis-catalog-preflight-'));
  const output = path.join(dir, 'catalog.jsonl');
  const sidecar = path.join(dir, 'catalog.meta.json');
  const previousFetch = globalThis.fetch;
  try {
    await writeFile(sidecar, '{}\n');
    let submitted = false;
    globalThis.fetch = (async () => {
      submitted = true;
      throw new Error('remote submission must not occur');
    });

    await assert.rejects(
      () => cmd.execute(makeCtx({ projectId: 1, output })),
      /Catalog output path already exists/,
    );
    assert.equal(submitted, false);
  } finally {
    globalThis.fetch = previousFetch;
    await rm(dir, { recursive: true, force: true });
  }
});

await test('analysis-meta catalog online search sends one typed cross-resource request without writing a file', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/catalog/list.ts', 'metadataCatalogList');
  const { url, body, result } = await captureCapabilityExecute(cmd, {
    projectId: 1,
    queries: ['付费事件', '支付事件', '充值事件'],
    resourceTypes: ['event', 'metric'],
    limitPerType: 20,
  }, {
    items: [{
      resource_type: 'event',
      resource_key: 'payment',
      display_name: '充值事件',
      matched_query: '充值事件',
      matched_field: 'display_name',
      match_type: 'exact',
    }],
    resource_counts: { event: 1, metric: 0 },
    matched_counts: { event: 1, metric: 0 },
    total: 1,
    limit_per_type: 20,
    has_more: false,
    truncated_resource_types: [],
  });

  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.catalog.list/execute`);
  assert.deepEqual(body.input, {
    project_id: 1,
    queries: ['付费事件', '支付事件', '充值事件'],
    resource_types: ['event', 'metric'],
    limit_per_type: 20,
  });
  assert.equal('all' in result, false);
  assert.equal(result.items[0].resource_key, 'payment');
});

await test('analysis-meta event export rejects incomplete gateway data without publishing a file', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/event/export.ts', 'metadataEventExport');
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-cli-event-catalog-incomplete-'));
  const output = path.join(dir, 'events.json');
  try {
    await assert.rejects(
      captureCapabilityExecute(cmd, {
        projectId: 1,
        output,
      }, {
        events: [{ event_name: 'pay' }],
        total: 2,
        complete: true,
      }),
      /export is incomplete/,
    );
    await assert.rejects(access(output));
    assert.deepEqual(await readdir(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test('analysis-meta catalog list requires a complete online search selector', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/catalog/list.ts', 'metadataCatalogList');
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'output'), false);
  assert.throws(
    () => cmd.validate(makeCtx({ projectId: 1 })),
    /requires --queries and --resource-types/,
  );
  assert.throws(
    () => cmd.validate(makeCtx({
      projectId: 1,
      queries: ['pay'],
    })),
    /requires --queries and --resource-types/,
  );
  assert.throws(
    () => cmd.validate(makeCtx({
      projectId: 1,
      queries: ['pay'],
      resourceTypes: ['dashboard'],
    })),
    /--resource-types must be a JSON array/,
  );
});

await test('analysis-meta catalog export requires a JSONL output path', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/catalog/export.ts', 'metadataCatalogExport');
  assert.equal(cmd.flags.find((flag) => flag.name === 'output')?.required, false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.throws(
    () => cmd.validate(makeCtx({ projectId: 1 })),
    /--output is required/,
  );
  assert.throws(
    () => cmd.validate(makeCtx({ projectId: 1, output: '/tmp/catalog.json' })),
    /--output must use the .jsonl extension/,
  );
});

await test('analysis-meta property list sends search pagination projection and auth filter', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/property/list.ts', 'metadataPropertyList');
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'output'), false);
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    scope: 'event',
    eventName: 'purchase',
    queries: ['login', 'sign in'],
    fields: ['prop_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticatedOnly: true,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.list/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    scope: 'event',
    event_name: 'purchase',
    queries: ['login', 'sign in'],
    fields: ['prop_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticated_only: true,
  });
});

await test('analysis-meta property export sends filters without pagination or local output', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/property/export.ts', 'metadataPropertyExport');
  assert.equal(cmd.flags.find((flag) => flag.name === 'output')?.required, true);
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'limit'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'offset'), false);
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    scope: 'event',
    eventName: 'purchase',
    queries: ['amount'],
    fields: ['prop_name'],
    authenticatedOnly: true,
    output: '/tmp/properties.json',
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.export/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    scope: 'event',
    event_name: 'purchase',
    queries: ['amount'],
    fields: ['prop_name'],
    authenticated_only: true,
  });
});

await test('analysis-meta property get sends table_type and prop_name to gateway', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/property/get.ts', 'metadataPropertyGet');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    tableType: 'event',
    propName: 'amount',
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.get/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    table_type: 'event',
    prop_name: 'amount',
  });
});

await test('analysis-meta property get preserves invalid table_type backend error', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/property/get.ts', 'metadataPropertyGet');
  const error = {
    ok: false,
    error: {
      type: 'validation',
      code: 'INVALID_TABLE_TYPE',
      message: 'table_type must be event or user',
    },
  };
  const { url, body } = await captureCapabilityError(
    () => cmd.execute(makeCtx({ projectId: 1, tableType: 'invalid', propName: 'amount' })),
    error,
  );
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.get/execute`);
  assert.deepEqual(body.input, {
    project_id: 1,
    table_type: 'invalid',
    prop_name: 'amount',
  });
});

await test('metadata.property.get legacy request body is rejected by gateway contract', async () => {
  const { validateCapability } = await import(
    pathToFileURL(path.join(ROOT, 'src/core/capability-api.ts')).href
  );
  const error = {
    ok: false,
    error: {
      type: 'validation',
      code: 'INVALID_CAPABILITY_INPUT',
      message: 'Unsupported input fields: property_name, property_scope',
    },
  };
  const { url, body } = await captureCapabilityError(
    () => validateCapability(HOST, 'analysis', 'metadata.property.get', {
      project_id: 1,
      property_name: 'amount',
      property_scope: 'event',
    }),
    error,
  );
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.get/validate`);
  assert.deepEqual(body.input, {
    project_id: 1,
    property_name: 'amount',
    property_scope: 'event',
  });
});

await test('analysis dashboard get uses analysis capability gateway', async () => {
  const cmd = await importCmd('src/commands/te-analysis/dashboard/get.ts', 'dashboardGet');
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1, dashboardId: 1001 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/analysis.dashboard.get/dry-run`);
  assert.deepEqual(body, { input: { project_id: 1, dashboard_id: 1001 } });
});

await test('analysis project-space list maps to project_space capability', async () => {
  const cmd = await importCmd('src/commands/te-analysis/project-space/list.ts', 'projectSpaceList');
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1, limit: 10 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/analysis.project_space.list/dry-run`);
  assert.deepEqual(body, { input: { project_id: 1, limit: 10 } });
});

await test('metadata data-table csv-write normalizes columns to gateway schema', async () => {
  const cmd = await importCmd('src/commands/metadata/data-table/csv-write.ts', 'dataTableCsvWrite');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    operation: 'create',
    inputFileId: 'ifile_0123456789abcdef0123456789abcdef',
    dataTableName: 'datatable_1_cli_data_table',
    columns: [{ name: 'user_id', type: 'string', display_name: 'User ID' }],
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.csv_write/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    operation: 'create',
    input_file_id: 'ifile_0123456789abcdef0123456789abcdef',
    data_table_name: 'datatable_1_cli_data_table',
    columns: [{ column_name: 'user_id', select_type: 'string', column_desc: 'User ID' }],
  });
});

await test('metadata data-table sql-write normalizes columns to gateway schema', async () => {
  const cmd = await importCmd('src/commands/metadata/data-table/sql-write.ts', 'dataTableSqlWrite');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    operation: 'create',
    tableName: 'datatable_1_sql_table',
    columns: [{ name: 'id', type: 'string', display_name: 'ID', is_primary_key: true }],
    qp: { taSqlVo: { sql: 'select 1 as id', sqlVoParams: [] }, taSqlView: {} },
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.sql_write/dry-run`);
  assert.deepEqual(body.input.columns, [
    { column_name: 'id', column_type: 'string', column_desc: 'ID', is_primary_key: true },
  ]);
});

await test('analysis favorite commands expose one canonical asset identity', async () => {
  const commands = [
    ['src/commands/te-analysis/favorite/add.ts', 'favoriteAdd', 'analysis.favorite.add'],
    ['src/commands/te-analysis/favorite/remove.ts', 'favoriteRemove', 'analysis.favorite.remove'],
  ];
  for (const [path, exportName, capabilityId] of commands) {
    const cmd = await importCmd(path, exportName);
    assert.equal(cmd.flags.find((flag) => flag.name === 'asset-id')?.required, true);
    assert.equal(cmd.flags.find((flag) => flag.name === 'asset-type')?.required, true);
    assert.equal(cmd.flags.some((flag) => flag.name === 'id'), false);
    assert.equal(cmd.flags.some((flag) => flag.name === 'payload'), false);
    const { url, body } = await captureCapabilityDryRun(cmd, {
      projectId: 1,
      assetId: 9,
      assetType: 'dashboard',
      spaceId: 3,
    });
    assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/${capabilityId}/dry-run`);
    assert.deepEqual(body.input, {
      project_id: 1,
      asset_id: 9,
      asset_type: 'dashboard',
      space_id: 3,
    });
  }
});

await test('analysis-meta metric create sends typed snake_case fields', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/create.ts', 'metadataMetricCreate');
  assert.equal(cmd.flags.find((flag) => flag.name === 'model-type')?.required, true);
  assert.equal(cmd.flags.some((flag) => flag.name === 'metric-mode'), false);
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    metricName: 'pay_count',
    metricDesc: 'Pay Count',
    modelType: 'event',
    metricEvents: [{
      time_range: { mode: 'previous', unit: 'day', value: 7 },
      metrics: [{
        formula: 'finish / order',
        dependencies: [
          { alias: 'finish', event: 'purchase_finish', aggregation: 'total_count' },
          { alias: 'order', event: 'order_create', aggregation: 'total_count' },
        ],
      }],
    }],
    metricParams: { format: 'percent' },
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    metric_name: 'pay_count',
    metric_desc: 'Pay Count',
    metric_mode: 0,
    metric_events: [{
      time_range: { mode: 'previous', unit: 'day', value: 7 },
      metrics: [{
        formula: 'finish / order',
        dependencies: [
          { alias: 'finish', event: 'purchase_finish', aggregation: 'total_count' },
          { alias: 'order', event: 'order_create', aggregation: 'total_count' },
        ],
      }],
    }],
    metric_params: { format: 'percent' },
  });
});

await test('analysis-meta metric create maps model-type to metric_mode', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/create.ts', 'metadataMetricCreate');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    metricName: 'retention_count',
    metricDesc: 'Retention Count',
    modelType: 'retention',
    metricEvents: [{ event_name: 'login', type: 'first' }],
    metricParams: { retention_type: 'retention' },
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    metric_name: 'retention_count',
    metric_desc: 'Retention Count',
    metric_mode: 1,
    metric_events: [{ event_name: 'login', type: 'first' }],
    metric_params: { retention_type: 'retention' },
  });
});

await test('analysis-meta metric get sends metric_id to gateway', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/get.ts', 'metadataMetricGet');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    metricId: 1001,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.get/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    metric_id: 1001,
  });
});

await test('analysis-meta metric list sends search pagination projection and auth filter', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/list.ts', 'metadataMetricList');
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'output'), false);
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    queries: ['pay', 'revenue'],
    fields: ['metric_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticatedOnly: true,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.list/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    queries: ['pay', 'revenue'],
    fields: ['metric_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticated_only: true,
  });
});

await test('analysis-meta metric export sends filters without pagination or local output', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/export.ts', 'metadataMetricExport');
  assert.equal(cmd.flags.find((flag) => flag.name === 'output')?.required, true);
  assert.equal(cmd.flags.some((flag) => flag.name === 'all'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'limit'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'offset'), false);
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    ignoreAuthentication: false,
    queries: ['pay'],
    fields: ['metric_name'],
    output: '/tmp/metrics.json',
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.export/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    ignore_authentication: false,
    queries: ['pay'],
    fields: ['metric_name'],
  });
});

await test('analysis user cluster and tag split bounded lists from complete exports', async () => {
  const userCommands = (await import(
    pathToFileURL(path.join(ROOT, 'src/commands/te-analysis/user/index.ts')).href
  )).default;
  const clusterList = userCommands.find(
    (command) => command.resource === 'user-cluster' && command.command === 'list',
  );
  const tagList = userCommands.find(
    (command) => command.resource === 'user-tag' && command.command === 'list',
  );
  const clusterExport = userCommands.find(
    (command) => command.resource === 'user-cluster' && command.command === 'export',
  );
  const tagExport = userCommands.find(
    (command) => command.resource === 'user-tag' && command.command === 'export',
  );
  assert.ok(clusterList);
  assert.ok(tagList);
  assert.ok(clusterExport);
  assert.ok(tagExport);
  for (const command of [clusterList, tagList]) {
    assert.equal(command.flags.some((flag) => flag.name === 'query'), false);
    assert.equal(command.flags.some((flag) => flag.name === 'queries'), true);
    assert.equal(command.flags.some((flag) => flag.name === 'all'), false);
    assert.equal(command.flags.some((flag) => flag.name === 'output'), false);
    const { body } = await captureCapabilityDryRun(command, {
      projectId: 1,
      queries: ['payer', 'paid audience'],
      limit: 50,
      offset: 0,
      authenticatedOnly: true,
    });
    assert.deepEqual(body.input, {
      project_id: 1,
      queries: ['payer', 'paid audience'],
      limit: 50,
      offset: 0,
      authenticated_only: true,
    });
  }
  for (const command of [clusterExport, tagExport]) {
    assert.equal(command.flags.some((flag) => flag.name === 'all'), false);
    assert.equal(command.flags.some((flag) => flag.name === 'limit'), false);
    assert.equal(command.flags.some((flag) => flag.name === 'offset'), false);
    assert.equal(command.flags.find((flag) => flag.name === 'output')?.required, true);
    const { body } = await captureCapabilityDryRun(command, {
      projectId: 1,
      queries: ['payer'],
      authenticatedOnly: true,
      output: '/tmp/audience.jsonl',
    });
    assert.deepEqual(body.input, {
      project_id: 1,
      queries: ['payer'],
      authenticated_only: true,
    });
  }
});

await test('analysis-meta metric update maps legacy model-type fields to gateway input', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/update.ts', 'metadataMetricUpdate');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    metricId: 1001,
    metricName: 'pay_count',
    metricDesc: 'Pay Count',
    metricRemark: 'Core pay',
    modelType: 'retention',
    metricEvents: [{ eventName: 'login', type: 'first' }],
    metricParams: { retentionType: 'retention' },
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.update/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    metric_id: 1001,
    metric_name: 'pay_count',
    metric_desc: 'Pay Count',
    metric_remark: 'Core pay',
    metric_mode: 1,
    metric_events: [{ eventName: 'login', type: 'first' }],
    metric_params: { retentionType: 'retention' },
  });
});

await test('analysis-meta metric delete sends metric_id to gateway', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/delete.ts', 'metadataMetricDelete');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    metricId: 1001,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.delete/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    metric_id: 1001,
  });
});

await test('analysis-meta virtual-event create builds payload from typed fields', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/virtual-event/create.ts',
    'metadataVirtualEventCreate',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    eventName: 'ta@pay_or_cart',
    eventDesc: 'Pay Or Cart',
    remark: 'Demo virtual event',
    events: [{ event_name: 'purchase' }, { event_name: 'add_to_cart' }],
    filter: { relation: 'and', items: [] },
    override: true,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.virtual_event.create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    payload: {
      event_name: 'ta@pay_or_cart',
      event_desc: 'Pay Or Cart',
      remark: 'Demo virtual event',
      rule: {
        events: [{ event_name: 'purchase' }, { event_name: 'add_to_cart' }],
        filter: { relation: 'and', items: [] },
      },
    },
    override: true,
  });
});

await test('analysis-meta virtual-property create sends typed snake_case fields', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/virtual-property/create.ts',
    'metadataVirtualPropertyCreate',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    sqlExpression: '1',
    vProp: { property: { column_name: 'v_pay', column_desc: 'V Pay', table_type: 'event', select_type: 'string' } },
    properties: [],
    sqlEventRelationType: 'relation_by_setting',
    relatedEvents: [{ event_name: 'pay', event_desc: 'Pay' }],
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.virtual_property.create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    sql_expression: '1',
    v_prop: { property: { column_name: 'v_pay', column_desc: 'V Pay', table_type: 'event', select_type: 'string' } },
    sql_event_relation_type: 'relation_by_setting',
    related_events: [{ event_name: 'pay', event_desc: 'Pay' }],
  });
});

await test('analysis-meta virtual-property create builds v_prop from legacy typed fields', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/virtual-property/create.ts',
    'metadataVirtualPropertyCreate',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    sqlExpression: 'CASE WHEN status = 1 THEN "active" ELSE "inactive" END',
    propertyName: '#vp@status_label',
    propertyDesc: 'Status Label',
    propertyRemark: 'Demo virtual property',
    tableType: 'event',
    selectType: 'string',
    sqlEventRelationType: 'relation_by_setting',
    relatedEvents: [{ eventName: 'purchase' }],
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.virtual_property.create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    sql_expression: 'CASE WHEN status = 1 THEN "active" ELSE "inactive" END',
    v_prop: {
      property: {
        column_name: '#vp@status_label',
        column_desc: 'Status Label',
        column_remark: 'Demo virtual property',
        table_type: 'event',
        select_type: 'string',
      },
    },
    sql_event_relation_type: 'relation_by_setting',
    related_events: [{ eventName: 'purchase' }],
  });
});

await test('analysis-meta virtual-property sql-rule-update keeps prop_id beside property', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/virtual-property/sql-rule-update.ts',
    'metadataVirtualPropertySqlRuleUpdate',
  );
  const vProp = {
    prop_id: 22990,
    property: {
      column_name: '#vp@finance_diamond_usd_monthly',
      table_type: 'event',
      select_type: 'number',
    },
  };
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 3,
    sqlExpression: '1',
    vProp,
    sqlEventRelationType: 'relation_default',
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.virtual_property.sql_rule_update/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 3,
    sql_expression: '1',
    v_prop: vProp,
    sql_event_relation_type: 'relation_default',
  });
});

await test('analysis-meta event-property-bundle import pre-import sends input_file_id', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/super-metadata/import.ts',
    'metadataSuperMetadataImport',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    operation: 'pre_import',
    inputFileId: 'ifile_0123456789abcdef0123456789abcdef',
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.event_property_bundle.import/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    operation: 'pre_import',
    input_file_id: 'ifile_0123456789abcdef0123456789abcdef',
  });
});

await test('analysis-meta super-metadata batch-create sends grouped arrays', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/super-metadata/batch-create.ts',
    'metadataSuperMetadataBatchCreate',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    events: [{ event_name: 'purchase', event_desc: 'Purchase', super_event_prop_names: ['amount'] }],
    eventProperties: [{ prop_name: 'amount', select_type: 'number', super_event_names: ['purchase'] }],
    userProperties: [{ prop_name: 'vip_level', select_type: 'string' }],
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.super_metadata.batch_create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    events: [{ event_name: 'purchase', event_desc: 'Purchase', super_event_prop_names: ['amount'] }],
    event_properties: [{ prop_name: 'amount', select_type: 'number', super_event_names: ['purchase'] }],
    user_properties: [{ prop_name: 'vip_level', select_type: 'string' }],
  });
});

await test('analysis-meta super-metadata batch-edit sends type and items', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/super-metadata/batch-edit.ts',
    'metadataSuperMetadataBatchEdit',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    type: 'event_property',
    items: [{ prop_name: 'amount', prop_desc: 'Amount', prop_remark: 'Revenue amount' }],
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.super_metadata.batch_edit/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    type: 'event_property',
    items: [{ prop_name: 'amount', prop_desc: 'Amount', prop_remark: 'Revenue amount' }],
  });
});

await test('analysis-governance asset list uses governance capability through analysis gateway', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/asset/usage-list.ts',
    'analysisMetaAssetUsageList',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    query: 'pay',
    limit: 20,
    offset: 0,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/governance.asset.list/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    query: 'pay',
    limit: 20,
    offset: 0,
  });
});

await test('analysis-meta asset-authentication list uses standalone metadata resource', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/asset/authentication-list.ts',
    'metadataAssetAuthenticationList',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1, limit: 100, offset: 100 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.asset_authentication.list/dry-run`);
  assert.deepEqual(body.input, { project_id: 1, limit: 100, offset: 100 });
});

await test('analysis-governance asset-authentication list sends typed server-side filters', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/governance/asset-authentication-list.ts',
    'analysisGovernanceAssetAuthenticationList',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 3,
    assetTypes: ['dashboard', 'report'],
    authenticationStatus: 0,
    queries: ['gateway'],
    heatCountGt: 50,
    userCountGt: 5,
    match: 'any',
    fields: ['resource_type', 'resource_key', 'heat_count90d'],
    limit: 100,
    offset: 0,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/governance.asset_authentication.list/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 3,
    asset_types: ['dashboard', 'report'],
    authentication_status: 0,
    queries: ['gateway'],
    heat_count_gt: 50,
    user_count_gt: 5,
    match: 'any',
    fields: ['resource_type', 'resource_key', 'heat_count90d'],
    limit: 100,
    offset: 0,
  });
});

await test('analysis-governance asset-authentication export atomically writes JSONL and exact sidecar', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/governance/asset-authentication-export.ts',
    'analysisGovernanceAssetAuthenticationExport',
  );
  assert.equal(cmd.flags.some((flag) => flag.name === 'limit'), false);
  assert.equal(cmd.flags.some((flag) => flag.name === 'offset'), false);
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-cli-asset-authentication-'));
  const output = path.join(dir, 'assets.jsonl');
  try {
    const rows = [
      { resource_type: 'dashboard', resource_key: '4350', display_name: 'Gateway' },
      { resource_type: 'report', resource_key: '18111', display_name: 'Usage' },
    ];
    const { body, result } = await captureCapabilityExecute(cmd, {
      projectId: 3,
      assetTypes: ['dashboard', 'report'],
      output,
    }, {
      assets: rows,
      total: 2,
      complete: true,
      project_id: 3,
      stat_as_of: '2026-08-25',
      snapshot_hash: 'a'.repeat(64),
    });
    assert.deepEqual(body.input, { project_id: 3, asset_types: ['dashboard', 'report'] });
    assert.equal(result.output_path, output);
    assert.equal(result.metadata_path, `${output}.meta.json`);
    assert.deepEqual(
      (await readFile(output, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)),
      rows,
    );
    const metadata = JSON.parse(await readFile(`${output}.meta.json`, 'utf8'));
    assert.equal(metadata.complete, true);
    assert.equal(metadata.project_id, 3);
    assert.equal(metadata.total, 2);
    assert.equal(metadata.stat_as_of, '2026-08-25');
    assert.equal(metadata.snapshot_hash, 'a'.repeat(64));
    assert.match(metadata.checksum, /^[a-f0-9]{64}$/);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert.equal((await stat(`${output}.meta.json`)).mode & 0o777, 0o600);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test('analysis-governance asset-authentication update normalizes JSONL rows to asset_refs', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/governance/asset-authentication-update.ts',
    'analysisGovernanceAssetAuthenticationUpdate',
  );
  const dir = await mkdtemp(path.join(tmpdir(), 'ae-cli-asset-authentication-update-'));
  const assetFile = path.join(dir, 'selected.jsonl');
  try {
    await writeFile(assetFile, [
      JSON.stringify({ resource_type: 'dashboard', resource_key: '4350', display_name: 'Gateway' }),
      JSON.stringify({ resource_type: 'event', resource_key: 'ai_model_usage' }),
      '',
    ].join('\n'));
    const { url, body } = await captureCapabilityDryRun(cmd, {
      projectId: 3,
      authenticationStatus: 1,
      assetFile,
      expectedSnapshotHash: 'b'.repeat(64),
      requestId: `cli_${'c'.repeat(32)}`,
    });
    assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/governance.asset_authentication.update/dry-run`);
    assert.deepEqual(body.input, {
      project_id: 3,
      authentication_status: 1,
      asset_refs: [
        { resource_type: 'dashboard', resource_key: '4350' },
        { resource_type: 'event', resource_key: 'ai_model_usage' },
      ],
      expected_snapshot_hash: 'b'.repeat(64),
      request_id: `cli_${'c'.repeat(32)}`,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test('analysis-governance rule list sends shared pagination', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/asset/rule-list.ts',
    'analysisMetaAssetRuleList',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1, limit: 25, offset: 50 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/governance.rule.list/dry-run`);
  assert.deepEqual(body.input, { project_id: 1, limit: 25, offset: 50 });
});

await test('analysis-meta asset-abnormal get uses standalone metadata resource', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/asset/abnormal-get.ts',
    'metadataAssetAbnormalGet',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    resourceType: 'event',
    resourceId: 'pay',
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.asset_abnormal.get/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    resource_type: 'event',
    resource_id: 'pay',
  });
});

await test('analysis-meta asset url-get sends resource identity to gateway', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/asset/url-get.ts',
    'analysisMetaAssetUrlGet',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    resourceType: 'dashboard',
    resourceId: '10',
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/analysis_meta.asset_url.get/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    resource_type: 'dashboard',
    resource_id: '10',
  });
});

await test('analysis-meta asset url-get absolutizes relative resource links', async () => {
  const cmd = await importCmd(
    'src/commands/te-analysis/meta/asset/url-get.ts',
    'analysisMetaAssetUrlGet',
  );
  const { result } = await captureCapabilityExecute(
    cmd,
    {
      projectId: 1,
      resourceType: 'dashboard',
      resourceId: '10',
    },
    {
      raw_url: '/#/panel/panel/1_10',
      markdown_link: '[View Resource](/#/panel/panel/1_10)',
      nested: {
        share_link: '/#/share/10',
      },
    },
  );
  assert.equal(result.raw_url, `${HOST}/#/panel/panel/1_10`);
  assert.equal(result.markdown_link, `[View Resource](${HOST}/#/panel/panel/1_10)`);
  assert.equal(result.nested.share_link, `${HOST}/#/share/10`);
});

await test('analysis input-file upload uses analysis gateway input-files endpoint', () => {
  const data = runMcpDryRun([
    'analysis',
    'input-file',
    'upload',
    '--project-id',
    '1',
    '--purpose',
    'data_table.csv',
    '--file',
    '/tmp/ae-cli-data-table.csv',
  ]);
  assert.equal(data.method, 'POST');
  assert.equal(data.url, `${HOST}/api/cli/analysis/v1/input-files`);
  assert.deepEqual(data.body, {
    multipart: {
      project_id: 1,
      purpose: 'data_table.csv',
      file: '/tmp/ae-cli-data-table.csv',
    },
  });
});

await test('metadata property bind-existing-dimension-table normalizes dictionary column names', async () => {
  const cmd = await importCmd(
    'src/commands/metadata/property/dimension-table/bind-existing.ts',
    'propertyDimensionTableBindExisting',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    propertyName: 'user_id',
    propertyScope: 'user',
    dataTableId: 42,
    timestampJoinFormat: 'yyyy-MM-dd',
    dictColumns: ['display_name'],
  });
  assert.equal(
    url,
    `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.bind_existing_dimension_table/dry-run`,
  );
  assert.deepEqual(body.input, {
    project_id: 1,
    property_name: 'user_id',
    property_scope: 'user',
    data_table_id: 42,
    timestamp_join_format: 'yyyy-MM-dd',
    dict_columns: [{ column_name: 'display_name' }],
  });
});

await test('metadata property create-and-bind-csv-dimension-table normalizes columns to gateway schema', async () => {
  const cmd = await importCmd(
    'src/commands/metadata/property/dimension-table/create-and-bind-csv.ts',
    'propertyDimensionTableCreateAndBindCsv',
  );
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    propertyName: 'user_id',
    propertyScope: 'user',
    inputFileId: 'ifile_0123456789abcdef0123456789abcdef',
    columns: [{ name: 'id', type: 'string', display_name: 'ID' }],
  });
  assert.equal(
    url,
    `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.create_and_bind_csv_dimension_table/dry-run`,
  );
  assert.deepEqual(body.input.columns, [{ column_name: 'id', select_type: 'string', column_desc: 'ID' }]);
});

await test('legacy analysis MCP builder commands remain unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis',
    '+build_event_analysis_qp',
    '--project_id',
    '1',
    '--time_range',
    '{"mode":"previous","unit":"day","value":7}',
    '--metrics',
    '[{"event":"login","aggregation":"user_count"}]',
    '--authenticated_only',
    'true',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+build_event_analysis_qp'/);
});
await test('legacy analysis_common get_resource_url command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_common',
    '+get_resource_url',
    '--project_id',
    '1',
    '--resource_type',
    'dashboard',
    '--resource_id',
    '10',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command 'analysis_common'/);
});
await test('legacy analysis_meta compatibility domain remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+batch_create_metadata',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command 'analysis_meta'/);
  assert.match(result.stderr, /Did you mean analysis-meta/);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
