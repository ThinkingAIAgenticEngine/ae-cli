import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  setCliTokenManual('cli-test-token', HOST);
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
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.list/dry-run`);
  assert.deepEqual(body, { input: { project_id: 1 } });
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

await test('analysis-meta metric create sends typed snake_case fields', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/create.ts', 'metadataMetricCreate');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    metricName: 'pay_count',
    metricDesc: 'Pay Count',
    metricMode: 0,
    metricEvents: [{ eventName: 'pay', analysis: 'A101' }],
    metricParams: {},
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    metric_name: 'pay_count',
    metric_desc: 'Pay Count',
    metric_mode: 0,
    metric_events: [{ eventName: 'pay', analysis: 'A101' }],
    metric_params: {},
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
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.asset_authentication.list/dry-run`);
  assert.deepEqual(body.input, { project_id: 1 });
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

await test('metadata property bind-existing-dimension-table maps to dimension-table binding capability', async () => {
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
    dict_columns: ['display_name'],
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
await test('analysis_meta list commands pass authenticatedOnly to MCP arguments', () => {
  const data = runMcpDryRun(['analysis_meta', '+list_events', '--project_id', '1', '--authenticated_only', 'true']);
  assert.equal(data.body.name, 'list_events');
  assert.equal(data.body.arguments.authenticatedOnly, true);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
