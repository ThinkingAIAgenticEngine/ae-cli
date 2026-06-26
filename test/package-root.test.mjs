import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distIndex = path.join(__dirname, '../dist/index.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  OK: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

console.log('package-root tests');

test('dist bundle recognizes open-source package name', () => {
  const dist = readFileSync(distIndex, 'utf8');
  assert.match(dist, /@thinkingai\/ae-cli/);
});

test('ae-cli --version exits successfully from local package root', () => {
  const result = spawnSync(process.execPath, [distIndex, '-V'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\d+\.\d+\.\d+/);
});
