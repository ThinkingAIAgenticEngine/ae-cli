import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);

const deprecatedVersions = new Map([
  ['fstream', new Set(['1.0.12'])],
  ['glob', new Set(['7.2.3'])],
  ['inflight', new Set(['1.0.6'])],
  ['lodash.isequal', new Set(['4.5.0'])],
  ['rimraf', new Set(['2.7.1'])],
  ['uuid', new Set(['8.3.2'])],
]);

test('production dependencies exclude ExcelJS and keep its CommonJS-compatible archiver API', () => {
  assert.equal(packageJson.dependencies.exceljs, undefined);
  assert.equal(packageJson.dependencies.archiver, '^5.3.2');
  assert.equal(packageJson.dependencies.unzipper, '^0.12.5');
  assert.equal(packageJson.devDependencies.exceljs, '^4.4.0');
});

test('ExcelJS build-time overrides stay on the verified dependency versions', () => {
  assert.deepEqual(packageJson.overrides.exceljs, {
    'fast-csv': '5.0.7',
    unzipper: '0.12.5',
    uuid: '11.1.1',
  });
});

test('ExcelJS can load and create its streaming writer with the installed archiver', () => {
  const Archiver = require('archiver');
  const ExcelJS = require('exceljs');

  assert.equal(typeof Archiver, 'function');
  const writer = new ExcelJS.stream.xlsx.WorkbookWriter();
  assert.ok(writer.zip);
  writer.zip.abort();
});

test('lockfile limits deprecated versions to the accepted archiver compatibility debt', () => {
  const matches = [];
  for (const [path, metadata] of Object.entries(packageLock.packages)) {
    if (!metadata?.version) continue;
    const name = path.split('node_modules/').at(-1);
    if (name && deprecatedVersions.get(name)?.has(metadata.version)) {
      matches.push(`${name}@${metadata.version}`);
    }
  }
  assert.deepEqual([...new Set(matches)].sort(), ['glob@7.2.3', 'inflight@1.0.6']);
});
