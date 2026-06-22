import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

function test(name, fn) {
  try {
    fn();
    console.log(`  OK: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

function tempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-cluster-mode-'));
}

function tempClusterInfoFile() {
  return path.join(tempHome(), 'cluster-info.json');
}

function runCli(clusterInfoFile, args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', ...args], {
    cwd: ROOT,
    env: { ...process.env, HOME: path.dirname(clusterInfoFile), AE_CLUSTER_INFO_FILE: clusterInfoFile },
    encoding: 'utf-8',
  });
}

function writeClusterInfo(clusterInfoFile, enabled) {
  const dir = path.dirname(clusterInfoFile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    clusterInfoFile,
    JSON.stringify({ sw_cfg_enable_global_query: enabled }, null, 2),
  );
}

console.log('multi-cluster mode tests');

test('defaults to base analysis mapping and hides global-only commands and flags', () => {
  const clusterInfoFile = tempClusterInfoFile();

  const analysisHelp = runCli(clusterInfoFile, ['analysis', '--help']);
  assert.equal(analysisHelp.status, 0, analysisHelp.stderr);
  assert.equal(analysisHelp.stdout.includes('+list_query_clusters'), false);

  const reportHelp = runCli(clusterInfoFile, ['analysis', '+query_report_data', '--help']);
  assert.equal(reportHelp.status, 0, reportHelp.stderr);
  assert.equal(reportHelp.stdout.includes('cluster_query_scope'), false);
  assert.equal(reportHelp.stdout.includes('slave_cluster_id'), false);

  const dryRun = runCli(clusterInfoFile, [
    '--host',
    'https://ta.example',
    '--dry-run',
    'analysis',
    '+list_reports',
    '--project_id',
    '1',
  ]);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  const payload = JSON.parse(dryRun.stdout);
  assert.equal(payload.data.url, 'https://ta.example/mcp/analysis/http/analysis');
});

test('enabled cluster-info switches analysis mapping and exposes global-only command and flags', () => {
  const clusterInfoFile = tempClusterInfoFile();
  writeClusterInfo(clusterInfoFile, true);

  const analysisHelp = runCli(clusterInfoFile, ['analysis', '--help']);
  assert.equal(analysisHelp.status, 0, analysisHelp.stderr);
  assert.equal(analysisHelp.stdout.includes('+list_query_clusters'), true);

  const reportHelp = runCli(clusterInfoFile, ['analysis', '+query_report_data', '--help']);
  assert.equal(reportHelp.status, 0, reportHelp.stderr);
  assert.equal(reportHelp.stdout.includes('cluster_query_scope'), true);
  assert.equal(reportHelp.stdout.includes('slave_cluster_id'), true);

  const dryRun = runCli(clusterInfoFile, [
    '--host',
    'https://ta.example',
    '--dry-run',
    'analysis',
    '+list_reports',
    '--project_id',
    '1',
  ]);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  const payload = JSON.parse(dryRun.stdout);
  assert.equal(payload.data.url, 'https://ta.example/mcp/analysis/http/analysis-global');
});

test('config cluster-mode command toggles cluster-info.json', () => {
  const clusterInfoFile = tempClusterInfoFile();

  const enable = runCli(clusterInfoFile, ['config', 'cluster-mode', 'enable']);
  assert.equal(enable.status, 0, enable.stderr);
  const enabled = JSON.parse(fs.readFileSync(clusterInfoFile, 'utf-8'));
  assert.equal(enabled.sw_cfg_enable_global_query, true);

  const status = runCli(clusterInfoFile, ['config', 'cluster-mode', 'status']);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(JSON.parse(status.stdout).data.sw_cfg_enable_global_query, true);
  assert.equal(JSON.parse(status.stdout).data.path, clusterInfoFile);

  const disable = runCli(clusterInfoFile, ['config', 'cluster-mode', 'disable']);
  assert.equal(disable.status, 0, disable.stderr);
  const disabled = JSON.parse(fs.readFileSync(clusterInfoFile, 'utf-8'));
  assert.equal(disabled.sw_cfg_enable_global_query, false);
});

console.log('All multi-cluster mode tests passed.');
