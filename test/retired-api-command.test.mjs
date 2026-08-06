import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT = process.cwd();

function runCli(...args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

test('raw api command is absent from root help', () => {
  const result = runCli('--help');

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /^\s+api(?:\s|$)/m);
});

test('raw api command cannot be invoked', () => {
  const result = runCli('api', 'GET', '/v1/ta/event/catalog/listEvent');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown command 'api'/);
});
