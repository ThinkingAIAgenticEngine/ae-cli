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

test('archive and spreadsheet dependencies are bundled instead of installed in the published CLI', () => {
  assert.equal(packageJson.dependencies.exceljs, undefined);
  assert.equal(packageJson.dependencies.archiver, undefined);
  assert.equal(packageJson.dependencies.xlsx, undefined);
  assert.equal(packageJson.dependencies.unzipper, '^0.12.5');
  assert.equal(packageJson.devDependencies.archiver, '7.0.1');
  assert.equal(packageJson.devDependencies.exceljs, '^4.4.0');
  assert.equal(packageJson.devDependencies['@types/archiver'], '7.0.0');
  assert.equal(
    packageJson.devDependencies.xlsx,
    'https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz',
  );
});

test('ExcelJS build-time overrides stay on the verified dependency versions', () => {
  assert.deepEqual(packageJson.overrides.exceljs, {
    archiver: '7.0.1',
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

test('security-sensitive dependencies stay on the verified patched versions', () => {
  assert.equal(packageJson.dependencies['stream-json'], '3.6.0');
  assert.equal(packageJson.dependencies.undici, '6.28.1');
  assert.equal(packageJson.devDependencies.tsx, '4.23.13');
  assert.equal(packageJson.devDependencies['@types/stream-json'], undefined);
  assert.equal(packageJson.overrides.esbuild, '0.28.1');
  assert.equal(packageJson.overrides.glob, '13.0.6');
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
