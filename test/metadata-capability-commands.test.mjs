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

async function captureCapabilityExecute(cmd, opts, responseData) {
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
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1 });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.list/dry-run`);
  assert.deepEqual(body, { input: { project_id: 1 } });
});

await test('analysis-meta datatable columns-get sends table_ref to gateway', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/datatable/columns-get.ts', 'metadataDataTableColumnsGet');
  const { url, body } = await captureCapabilityDryRun(cmd, { projectId: 1, tableRef: 'hive.ta.v_event_1' });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.columns_get/dry-run`);
  assert.deepEqual(body, { input: { project_id: 1, table_ref: 'hive.ta.v_event_1' } });
});

await test('analysis-meta event list sends search pagination projection and auth filter', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/event/list.ts', 'metadataEventList');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    query: 'login',
    fields: ['event_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticatedOnly: true,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.event.list/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    query: 'login',
    fields: ['event_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticated_only: true,
  });
});

await test('analysis-meta property list sends search pagination projection and auth filter', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/property/list.ts', 'metadataPropertyList');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    scope: 'event',
    eventName: 'purchase',
    query: 'login',
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
    query: 'login',
    fields: ['prop_name', 'authentication_status'],
    limit: 20,
    offset: 0,
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

await test('analysis-meta metric create maps model-type to metric_mode', async () => {
  const cmd = await importCmd('src/commands/te-analysis/meta/metric/create.ts', 'metadataMetricCreate');
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    metricName: 'retention_count',
    metricDesc: 'Retention Count',
    modelType: 'retention',
    metricEvents: [{ eventName: 'login', type: 'first' }],
    metricParams: { retentionType: 'retention' },
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.create/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    metric_name: 'retention_count',
    metric_desc: 'Retention Count',
    metric_mode: 1,
    metric_events: [{ eventName: 'login', type: 'first' }],
    metric_params: { retentionType: 'retention' },
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
  const { url, body } = await captureCapabilityDryRun(cmd, {
    projectId: 1,
    query: 'pay',
    fields: ['metric_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticatedOnly: true,
  });
  assert.equal(url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.metric.list/dry-run`);
  assert.deepEqual(body.input, {
    project_id: 1,
    query: 'pay',
    fields: ['metric_name', 'authentication_status'],
    limit: 20,
    offset: 0,
    authenticated_only: true,
  });
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
await test('legacy analysis_meta list_events command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+list_events',
    '--project_id',
    '1',
    '--authenticated_only',
    'true',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+list_events'/);
});
await test('legacy analysis_meta list_properties command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+list_properties',
    '--project_id',
    '1',
    '--authenticated_only',
    'true',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+list_properties'/);
});
await test('legacy analysis_meta create_metric command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+create_metric',
    '--project_id',
    '1',
    '--name',
    'demo',
    '--display_name',
    'Demo',
    '--model_type',
    'event',
    '--events',
    '[]',
    '--params',
    '{}',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+create_metric'/);
});
await test('legacy analysis_meta get_metric command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+get_metric',
    '--project_id',
    '1',
    '--metric_id',
    '1001',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+get_metric'/);
});
await test('legacy analysis_meta list_metrics command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+list_metrics',
    '--project_id',
    '1',
    '--authenticated_only',
    'true',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+list_metrics'/);
});
await test('legacy analysis_meta update_metric command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+update_metric',
    '--project_id',
    '1',
    '--metric_id',
    '1001',
    '--name',
    'pay_count',
    '--display_name',
    'Pay Count',
    '--model_type',
    'event',
    '--events',
    '[]',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+update_metric'/);
});
await test('legacy analysis_meta delete_metric command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+delete_metric',
    '--project_id',
    '1',
    '--metric_id',
    '1001',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+delete_metric'/);
});
await test('legacy analysis_meta create_virtual_event command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+create_virtual_event',
    '--project_id',
    '1',
    '--event_name',
    'ta@demo',
    '--event_desc',
    'Demo',
    '--events',
    '[]',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+create_virtual_event'/);
});
await test('legacy analysis_meta create_virtual_property command remains unavailable', () => {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--dry-run',
    'analysis_meta',
    '+create_virtual_property',
    '--project_id',
    '1',
    '--property_name',
    '#vp@demo',
    '--table_type',
    'event',
    '--select_type',
    'string',
    '--sql_expression',
    'event_name',
    '--sql_event_relation_type',
    'relation_default',
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command '\+create_virtual_property'/);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
