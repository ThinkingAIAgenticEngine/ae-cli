import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '../src/core/update-check.ts');
const compatPath = path.join(__dirname, '../src/core/version-compat.ts');

const {
  isNewer,
  shouldSkipUpdateCheck,
} = await import(distPath);
const {
  formatCompatNotice,
} = await import(compatPath);

function test(name, fn) {
  try {
    fn();
    console.log(`  OK: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

console.log('update-check tests');

test('isNewer detects newer patch version', () => {
  assert.equal(isNewer('1.0.24', '1.0.23'), true);
});

test('isNewer rejects same version', () => {
  assert.equal(isNewer('1.0.23', '1.0.23'), false);
});

test('isNewer rejects older version', () => {
  assert.equal(isNewer('1.0.22', '1.0.23'), false);
});

test('isNewer handles prerelease core segment', () => {
  assert.equal(isNewer('2.0.0', '1.9.9-rc.1'), true);
});

test('shouldSkipUpdateCheck respects --no-update-check', () => {
  assert.equal(shouldSkipUpdateCheck(['node', 'ae-cli', '--no-update-check', 'kb', '+grep']), true);
});

test('shouldSkipUpdateCheck respects --version', () => {
  assert.equal(shouldSkipUpdateCheck(['node', 'ae-cli', '--version']), true);
});

test('shouldSkipUpdateCheck allows a subcommand --version value', () => {
  assert.equal(
    shouldSkipUpdateCheck(['node', 'ae-cli', 'agent', '+edit-skill', '--version', '2.2']),
    false,
  );
});

test('shouldSkipUpdateCheck allows normal commands', () => {
  assert.equal(shouldSkipUpdateCheck(['node', 'ae-cli', 'kb', '+grep']), false);
});

test('update dry-run retains its public envelope and typed plan fields', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-update-plan-'));
  let result;
  try {
    result = spawnSync(
      'npx',
      ['tsx', 'src/index.ts', '--no-update-check', '--dry-run', '--format', 'json', 'update',
        '--target', '6.0.34', '--host', 'https://plan-contract.invalid'],
      { encoding: 'utf8', env: { ...process.env, HOME: home, AE_CLI_NO_COMPAT_CHECK: '1' }, timeout: 30_000 },
    );
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.ok(body.data && typeof body.data === 'object' && !Array.isArray(body.data));
  assert.equal(body.data.action, 'update');
  assert.equal(body.data.dryRun, true);
  assert.equal(body.data.target, '6.0.34');
  assert.equal(body.data.host, 'https://plan-contract.invalid');
  assert.ok(Array.isArray(body.data.commands) && body.data.commands.length > 0);
  assert.ok(body.data.commands.every(command => typeof command === 'string' && command.length > 0));
  assert.ok(body.data.commands.some(command => /npm install -g @tant\/ae-cli@6\.0\.34/.test(command)));
  assert.doesNotMatch(body.data.commands.join(' '), /skills@.* add|#v/);
  assert.ok(Array.isArray(body.data.skillsSources));
  assert.ok(body.data.skillsSources.every(source => typeof source === 'string'));
  assert.ok(body.data.skillsSources.includes('installed-package'));
  assert.equal(body.data.skillsSources.includes('github-fallback'), false);
});

test('host compat notice only recommends the unified update command', () => {
  const notice = formatCompatNotice({
    kind: 'local_newer',
    local: '6.1.6',
    expected: '6.0.33',
    line: '6.0',
  });
  assert.match(notice, /Run: ae-cli update/);
  assert.doesNotMatch(notice, /npm i -g/);
  assert.doesNotMatch(notice, /npx skills add/);
});

console.log('All update-check tests passed.');
