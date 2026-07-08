import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

function test(name, fn) {
  fn();
  console.log(`  OK: ${name}`);
}

function runCli(args) {
  return spawnSync('node', ['dist/index.js', '--no-update-check', ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 15_000,
  });
}

console.log('tracking command tests');

test('tracking help lists registered plan/code/wiki/lang commands', () => {
  const r = runCli(['tracking', '--help']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /plan/);
  assert.match(r.stdout, /code/);
  assert.match(r.stdout, /wiki/);
  assert.match(r.stdout, /lang/);
});

test('tracking plan list-templates runs without auth', () => {
  const r = runCli(['tracking', 'plan', 'list-templates']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /TE官方模板_dataTrackSample|TE 埋点示例模板|template/);
});

test('tracking plan list-templates supports json output', () => {
  const r = runCli(['tracking', 'plan', 'list-templates', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const templates = JSON.parse(r.stdout);
  assert.ok(Array.isArray(templates));
  assert.ok(templates.some((item) => item.name === 'TE官方模板_dataTrackSample'));
});

test('tracking code import-template resolves template by name', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ae-cli-template-'));
  const out = path.join(dir, 'draft.json');
  try {
    const r = runCli([
      'tracking',
      'code',
      'import-template',
      '--template-name',
      'TE官方模板_dataTrackSample',
      '--out',
      out,
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(out));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('tracking wiki query runs locally', () => {
  const r = runCli(['tracking', 'wiki', 'query', '--keyword', 'sdk']);
  assert.equal(r.status, 0, r.stderr);
});

test('tracking lang status runs', () => {
  const r = runCli(['tracking', 'lang', 'status']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CLI language settings/);
});

test('plan fetch rejects directory --out with friendly message', () => {
  const home = process.env.HOME || '/tmp';
  const r = runCli(['tracking', 'plan', 'fetch', '-p', '1', '--out', `${home}/.ae-cli/`]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /--out must be a file path|必须是文件路径|ファイルパス|파일 경로/);
});

console.log('All tracking command tests passed.');
