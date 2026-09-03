import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

const deprecatedVersions = new Map([
  ['fstream', new Set(['1.0.12'])],
  ['glob', new Set(['7.2.3'])],
  ['inflight', new Set(['1.0.6'])],
  ['lodash.isequal', new Set(['4.5.0'])],
  ['rimraf', new Set(['2.7.1'])],
  ['uuid', new Set(['8.3.2'])],
]);

test('production dependencies exclude ExcelJS and use maintained archive packages', () => {
  assert.equal(packageJson.dependencies.exceljs, undefined);
  assert.equal(packageJson.dependencies.archiver, '^8.0.0');
  assert.equal(packageJson.dependencies.unzipper, '^0.12.5');
  assert.equal(packageJson.devDependencies.exceljs, '^4.4.0');
});

test('ExcelJS build-time overrides stay on the verified dependency versions', () => {
  assert.deepEqual(packageJson.overrides.exceljs, {
    archiver: '8.0.0',
    'fast-csv': '5.0.7',
    unzipper: '0.12.5',
    uuid: '11.1.1',
  });
});

test('lockfile excludes the deprecated versions reported by npm install', () => {
  const matches = [];
  for (const [path, metadata] of Object.entries(packageLock.packages)) {
    if (!metadata?.version) continue;
    const name = path.split('node_modules/').at(-1);
    if (name && deprecatedVersions.get(name)?.has(metadata.version)) {
      matches.push(`${name}@${metadata.version}`);
    }
  }
  assert.deepEqual(matches, []);
});
