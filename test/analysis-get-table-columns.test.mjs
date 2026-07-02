import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

function runCli(args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', ...args], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOME: os.tmpdir(),
    },
    encoding: 'utf-8',
  });
}

function test(name, fn) {
  try {
    fn();
    console.log(`  OK: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

console.log('analysis get_table_columns tests');

test('dry-run sends MCP tableRef argument', () => {
  const result = runCli([
    '--host',
    'https://ta.example',
    '--dry-run',
    'analysis',
    '+get_table_columns',
    '--project_id',
    '1',
    '--table_ref',
    'hive.ta.v_event_1',
  ]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.data.body.arguments, {
    projectId: 1,
    tableRef: 'hive.ta.v_event_1',
  });
});

console.log('All analysis get_table_columns tests passed.');
