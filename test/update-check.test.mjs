import assert from 'node:assert/strict';
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
  assert.equal(shouldSkipUpdateCheck(['node', 'ae-cli', '--no-update-check', 'kb', '+query']), true);
});

test('shouldSkipUpdateCheck respects --version', () => {
  assert.equal(shouldSkipUpdateCheck(['node', 'ae-cli', '--version']), true);
});

test('shouldSkipUpdateCheck allows normal commands', () => {
  assert.equal(shouldSkipUpdateCheck(['node', 'ae-cli', 'kb', '+query']), false);
});

test('update dry-run prints unified CLI and Skills commands', () => {
  const result = spawnSync(
    'npx',
    ['tsx', 'src/index.ts', '--no-update-check', '--dry-run', 'update', '--target', '6.0.34'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.data.action, 'update');
  assert.equal(body.data.target, '6.0.34');
  assert.deepEqual(body.data.commands, [
    'npm i -g @thinkingai/ae-cli@6.0.34',
    'npx skills add ThinkingAIAgenticEngine/ae-cli#v6.0.34 -g -y',
  ]);
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
