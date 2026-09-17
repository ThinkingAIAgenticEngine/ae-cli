import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  checkBundle, generateBundle, PACKAGE_ROOT, readCommittedSources, sha256, SOURCE_COMMIT, SOURCE_PATHS,
} from '../scripts/generate-page-context-references.mjs';

const sourceRoot = process.env.TA_CONTEXT_SOURCE;
const sources = sourceRoot ? readCommittedSources(sourceRoot) : null;
const sourceTest = (name, fn) => test(name, { skip: !sources && 'Set TA_CONTEXT_SOURCE to verify the pinned upstream commit.' }, fn);
const read = (name) => fs.readFileSync(path.join(PACKAGE_ROOT, name), 'utf8');
const manifest = JSON.parse(read('source-map.json'));

test('reference hashes and local links describe one complete portable package', () => {
  assert.equal(manifest.source_commit, SOURCE_COMMIT);
  assert.equal(manifest.references.length, 7);
  const targets = new Set(manifest.references.map((entry) => entry.target));
  for (const reference of manifest.references) {
    const content = read(reference.target);
    assert.equal(sha256(content), reference.sha256, reference.target);
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target) continue;
      assert.ok(!path.isAbsolute(target) && !/^[a-z]+:/i.test(target), `${reference.target}: nonportable link ${target}`);
      assert.ok(targets.has(path.posix.normalize(path.posix.join('references', target))), `${reference.target}: broken link ${target}`);
    }
  }
  for (const section of manifest.coverage) {
    assert.ok(section.targets.length > 0, `${section.heading}: missing destination`);
    section.targets.forEach((target) => assert.ok(targets.has(target), target));
  }
});

sourceTest('committed source reproduces all references and every source hash', () => {
  checkBundle(generateBundle(sources));
  for (const [key, sourcePath] of Object.entries(SOURCE_PATHS)) {
    assert.equal(manifest.sources.find((source) => source.path === sourcePath)?.sha256, sha256(sources[key]), sourcePath);
  }
});

sourceTest('every source operation row and target state path survives the projection', () => {
  for (const surface of ['dashboard', 'explore']) {
    const output = read(`references/${surface}-operations.md`);
    const heading = surface === 'dashboard' ? '5' : '6';
    const sourceSection = sources.dashboard.split(new RegExp(`^## ${heading}\\.`, 'm'))[1].split(/^## /m)[0];
    for (const row of sourceSection.split('\n').filter((line) => line.startsWith(`| \`${surface}\` |`))) {
      assert.ok(output.includes(row), `Missing operation row: ${row}`);
    }
    const targets = [...sourceSection.matchAll(/^### `([^`]+)`$/gm)];
    const portable = (text) => text
      .replaceAll('第 9 节', '[business value reference](dashboard-business-values.md)')
      .replaceAll('第 10 节', '[exploration query reference](explore-query-inheritance.md)');
    for (const [index, target] of targets.entries()) {
      const completeEntry = sourceSection.slice(target.index, targets[index + 1]?.index ?? sourceSection.length).trim();
      assert.ok(output.includes(`### \`${target[1]}\``), target[1]);
      assert.ok(output.includes(portable(completeEntry)), `Missing complete state paths or cautions: ${target[1]}`);
    }
  }
  const logRows = sources.log.split('<!-- LOG_CONTEXT_OPERATION_DICTIONARY:START -->')[1].split('<!-- LOG_CONTEXT_OPERATION_DICTIONARY:END -->')[0].trim();
  assert.ok(read('references/asset-governance-log.md').includes(logRows));
  const governanceRows = sources.governance.split('\n').filter((line) => /^\| `(normal|batch) \/ /.test(line));
  for (const row of governanceRows) assert.ok(read('references/asset-governance.md').includes(row.replaceAll('selectedNodeIds', 'selectedAssetIds')), row);
});

sourceTest('all seven batch values are derived from the source enum including member/value differences', () => {
  const enumText = sources.batch.match(/export enum BatchOpTypeEnum \{([\s\S]*?)\n\}/)[1];
  const entries = [...enumText.matchAll(/(\w+) = '([^']+)'/g)];
  assert.equal(entries.length, 7);
  const output = read('references/asset-governance.md');
  for (const [, member, value] of entries) assert.ok(output.includes(`| \`${member}\` | \`${value}\` |`), member);
  assert.notEqual(entries.find((entry) => entry[1] === 'ASSET_TRANSFER')[1], 'ASSET_HANDOVER');
  assert.equal(entries.find((entry) => entry[1] === 'ASSET_TRANSFER')[2], 'ASSET_HANDOVER');
});

sourceTest('new or unnumbered source sections cannot be silently omitted', () => {
  for (const extra of ['## 11. New business semantics\n', '## New business semantics\n']) {
    assert.throws(() => generateBundle({ ...sources, dashboard: `${sources.dashboard}\n${extra}` }), /Unmapped source sections/);
  }
  assert.throws(() => generateBundle({ ...sources, dashboard: sources.dashboard.replace('### 9.6', '### 9.7') }), /Unmapped source sections/);
});

sourceTest('an operation table entry without its explanation is rejected', () => {
  const changed = sources.dashboard.replace('### `dashboard / groups`', '### `dashboard / unmapped_groups`');
  assert.throws(() => generateBundle({ ...sources, dashboard: changed }), /Operation coverage mismatch/);
});

test('missing, edited, or stale generated references are rejected without modifying the package', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'page-context-references-'));
  const files = { 'references/example.md': 'Original content\n', 'source-map.json': '{}\n' };
  try {
    fs.mkdirSync(path.join(root, 'references'));
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(root, name), content);
    checkBundle(files, root);
    fs.writeFileSync(path.join(root, 'references/example.md'), 'Changed content\n');
    assert.throws(() => checkBundle(files, root), /stale or missing/);
    fs.writeFileSync(path.join(root, 'references/example.md'), files['references/example.md']);
    fs.writeFileSync(path.join(root, 'references/obsolete.md'), 'Old artifact\n');
    assert.throws(() => checkBundle(files, root), /unmapped/);
    fs.unlinkSync(path.join(root, 'references/obsolete.md'));
    fs.unlinkSync(path.join(root, 'references/example.md'));
    assert.throws(() => checkBundle(files, root), /stale or missing/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
