import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const HOST = 'http://localhost';

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

function runCli(args) {
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

await test('metadata data-table list maps to analysis gateway component', () => {
  const data = runCli(['metadata', 'data-table', 'list', '--project-id', '1']);
  assert.equal(data.method, 'POST');
  assert.equal(data.url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.list/dry-run`);
  assert.deepEqual(data.body, { input: { project_id: 1 } });
});

await test('metadata data-table csv-write keeps snake_case gateway input', () => {
  const data = runCli([
    'metadata',
    'data-table',
    'csv-write',
    '--project-id',
    '1',
    '--operation',
    'create',
    '--input-file-id',
    'ifile_0123456789abcdef0123456789abcdef',
    '--data-table-name',
    'cli_data_table',
    '--columns',
    '[{"name":"user_id","type":"string"}]',
  ]);
  assert.equal(data.url, `${HOST}/api/cli/analysis/v1/capabilities/metadata.data_table.csv_write/dry-run`);
  assert.deepEqual(data.body.input, {
    project_id: 1,
    operation: 'create',
    input_file_id: 'ifile_0123456789abcdef0123456789abcdef',
    data_table_name: 'cli_data_table',
    columns: [{ name: 'user_id', type: 'string' }],
  });
});

await test('metadata input-file upload uses analysis gateway input-files endpoint', () => {
  const data = runCli([
    'metadata',
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

await test('metadata property bind-existing-dimension-table maps to dimension-table binding capability', () => {
  const data = runCli([
    'metadata',
    'property',
    'bind-existing-dimension-table',
    '--project-id',
    '1',
    '--property-name',
    'user_id',
    '--property-scope',
    'user',
    '--data-table-id',
    '42',
    '--timestamp-join-format',
    'yyyy-MM-dd',
    '--dict-columns',
    '["display_name"]',
  ]);
  assert.equal(
    data.url,
    `${HOST}/api/cli/analysis/v1/capabilities/metadata.property.bind_existing_dimension_table/dry-run`,
  );
  assert.deepEqual(data.body.input, {
    project_id: 1,
    property_name: 'user_id',
    property_scope: 'user',
    data_table_id: 42,
    timestamp_join_format: 'yyyy-MM-dd',
    dict_columns: ['display_name'],
  });
});

await test('analysis builder commands pass authenticatedOnly to MCP arguments', () => {
  const data = runCli([
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
  ]);
  assert.equal(data.body.name, 'build_event_analysis_qp');
  assert.equal(data.body.arguments.authenticatedOnly, true);
});

await test('analysis_meta list commands pass authenticatedOnly to MCP arguments', () => {
  const data = runCli(['analysis_meta', '+list_events', '--project_id', '1', '--authenticated_only', 'true']);
  assert.equal(data.body.name, 'list_events');
  assert.equal(data.body.arguments.authenticatedOnly, true);
});

await test('analysis_audience definition builders keep authenticatedOnly outside request', () => {
  const data = runCli([
    'analysis_audience',
    '+build_tag_definition',
    '--project_id',
    '1',
    '--type',
    'condition',
    '--authenticated_only',
    'true',
  ]);
  assert.equal(data.body.name, 'build_tag_definition');
  assert.equal(data.body.arguments.authenticatedOnly, true);
  assert.equal(data.body.arguments.request.projectId, 1);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
