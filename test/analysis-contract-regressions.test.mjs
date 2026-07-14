import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

function runCli(args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', '--host', 'https://ta.example', '--dry-run', ...args], {
    cwd: ROOT,
    env: { ...process.env, HOME: os.tmpdir() },
    encoding: 'utf-8',
  });
}

function payload(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout).data;
}

const createId = payload(runCli([
  '--yes', 'analysis_audience', '+create_id_cluster',
  '--project_id', '1', '--display_name', 'Test', '--file_content', 'user_1', '--entity_id', '1',
]));
assert.match(createId.url, /analysis-extend$/);

const updateId = payload(runCli([
  '--yes', 'analysis_audience', '+update_id_cluster',
  '--project_id', '1', '--cluster_name', 'cluster_1', '--file_content', 'user_2',
]));
assert.match(updateId.url, /analysis-extend$/);

const deleteId = payload(runCli([
  '--yes', 'analysis_audience', '+delete_cluster',
  '--project_id', '1', '--cluster_name', 'cluster_1',
]));
assert.match(deleteId.url, /analysis-extend$/);

const buildCluster = payload(runCli([
  'analysis_audience', '+build_cluster_definition',
  '--project_id', '1', '--type', 'sql', '--sql', 'select "#user_id" from hive.ta.v_user_1',
]));
assert.deepEqual(buildCluster.body.arguments, {
  projectId: 1,
  type: 'sql',
  sql: 'select "#user_id" from hive.ta.v_user_1',
});

const updateReport = payload(runCli([
  '--yes', 'analysis', '+update_report',
  '--project_id', '1', '--report_id', '2', '--report_version', '0', '--report_name', 'Renamed',
]));
assert.equal(updateReport.body.arguments.version, 0);

const drilldown = payload(runCli([
  'analysis', '+drilldown_user_events',
  '--project_id', '1', '--user_id', 'u1', '--event_names', '["login"]',
  '--target_dates', '["2026-01-01 00:00:00"]', '--limit', '20', '--offset', '40',
  '--request_id', 'mcp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
]));
assert.equal(drilldown.body.arguments.limit, 20);
assert.equal(drilldown.body.arguments.offset, 40);
assert.equal('pageNum' in drilldown.body.arguments, false);
assert.equal('pageSize' in drilldown.body.arguments, false);

console.log('OK: analysis contract regression dry-runs passed.');
