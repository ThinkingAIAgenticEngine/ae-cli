import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = process.env.CLI_TEST_ENTRY || 'src/index.ts';
function run(args) {
  return spawnSync(process.execPath, [
    ...(entry.endsWith('.ts') ? ['--import', 'tsx'] : []),
    entry, '--no-update-check', 'project-semantic', ...args,
  ], { cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
}

test('real CLI exposes project asset-package export', () => {
  const result = run(['asset-package', 'export', '--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--project-id/);
  assert.match(result.stdout, /--asset-scope/);
});

test('real CLI project-semantic surface matches release/6.0 asset-package export only', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /asset-package/);
  assert.doesNotMatch(result.stdout, /\b(?:list|get|enable|disable|delete|delete-impact|candidate|release|retirement)\b/);

  const removed = run(['candidate', 'list', '--help']);
  assert.notEqual(removed.status, 0);
  assert.match(removed.stderr, /unknown command|Unknown command|not found/i);
});
