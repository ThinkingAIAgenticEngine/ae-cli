import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '../src/core/update-check.ts');

const {
  isNewer,
  resolveRegistry,
  buildInstallCommand,
  shouldSkipUpdateCheck,
  isUpdateCheckEnabled,
} = await import(distPath);

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

test('resolveRegistry maps open-source package', () => {
  assert.equal(resolveRegistry('@thinkingai/ae-cli'), 'https://registry.npmjs.org');
});

test('isUpdateCheckEnabled only for open-source package', () => {
  assert.equal(isUpdateCheckEnabled('@thinkingai/ae-cli'), true);
  assert.equal(isUpdateCheckEnabled('@tant/ae-cli'), false);
});

test('buildInstallCommand adds registry when not npmjs', () => {
  assert.equal(
    buildInstallCommand('@tant/ae-cli', 'https://npm.thinkingdata.cn:3443'),
    'npm install -g @tant/ae-cli@latest --registry=https://npm.thinkingdata.cn:3443',
  );
});

test('buildInstallCommand omits registry for npmjs', () => {
  assert.equal(
    buildInstallCommand('@thinkingai/ae-cli', 'https://registry.npmjs.org'),
    'npm install -g @thinkingai/ae-cli@latest',
  );
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

console.log('All update-check tests passed.');
