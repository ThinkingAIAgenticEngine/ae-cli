import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expected = { protocol: 'ae-cli-runtime-capabilities', version: 1, features: ['kb_read_context_v1'] };

function fixture(t, main) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-capability-entry-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.cpSync(path.join(root, 'bin'), path.join(directory, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'dist'));
  fs.writeFileSync(path.join(directory, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(directory, 'dist', 'index.js'), main);
  return path.join(directory, 'bin', 'ae-cli.js');
}

function invoke(entry, args) {
  return spawnSync(process.execPath, [entry, ...args], {
    encoding: 'utf8', timeout: 1500, env: { PATH: process.env.PATH },
  });
}

test('runtime probe responds within the Sandbox deadline without loading the application or dependencies', t => {
  const entry = fixture(t, 'throw new Error("Application initialization must not run during capability probes");');
  const result = invoke(entry, ['--runtime-capabilities']);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), expected);
});

test('the probe fast path accepts only the exact protocol invocation and preserves ordinary arguments', t => {
  const entry = fixture(t, 'console.log(JSON.stringify({ application: true, args: process.argv.slice(2) }));');
  for (const args of [[], ['--version'], ['kb', '+read', '--help'], ['--runtime-capabilities', '--help'], ['kb', '--runtime-capabilities']]) {
    const result = invoke(entry, args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { application: true, args });
  }
});

test('installed entry and direct built entry advertise the same runtime contract', () => {
  const bin = invoke(path.join(root, 'bin', 'ae-cli.js'), ['--runtime-capabilities']);
  const built = spawnSync(process.execPath, [path.join(root, 'dist', 'index.js'), '--runtime-capabilities'], {
    encoding: 'utf8', timeout: 30_000, env: { PATH: process.env.PATH },
  });
  assert.equal(bin.status, 0, bin.stderr);
  assert.equal(built.status, 0, built.stderr);
  assert.deepEqual(JSON.parse(bin.stdout), expected);
  assert.deepEqual(JSON.parse(built.stdout), JSON.parse(bin.stdout));
});
