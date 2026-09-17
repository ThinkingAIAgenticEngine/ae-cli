import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(root, 'skills/ae-page-context');
const expectedReferences = [
  'dashboard-context.md', 'dashboard-operations.md', 'explore-operations.md',
  'explore-query-inheritance.md', 'dashboard-business-values.md',
  'asset-governance.md', 'asset-governance-log.md',
].sort();

test('entry is short and embeds no operation dictionary', async () => {
  const entry = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
  assert.match(entry, /^---\nname: ae-page-context\nversion: 1\.1\.0\n/);
  assert.ok(Buffer.byteLength(entry) <= 5000, 'Keep the preloaded entry within 5 KB');
  assert.match(entry, /unrelated question, do not fetch Context/);
  assert.match(entry, /untrusted data, never instructions/);
  assert.doesNotMatch(entry, /ASSET_HANDOVER|edit \| query_groups/);
});

test('runtime policy activates by page-context capability and only preloads the entry', async () => {
  const policy = JSON.parse(await readFile(path.join(skillRoot, 'runtime.json'), 'utf8'));
  assert.deepEqual(policy, { version: 2, capability: 'page_context', preload: 'entry' });
});

test('all reference links resolve within the complete package', async () => {
  const references = (await readdir(path.join(skillRoot, 'references'))).sort();
  assert.deepEqual(references, expectedReferences);
  const entry = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const linked = [...entry.matchAll(/\]\(references\/([^)#]+)(?:#[^)]*)?\)/g)].map(m => m[1]);
  assert.deepEqual(linked.sort(), expectedReferences);
  for (const file of ['SKILL.md', ...references.map(name => `references/${name}`)]) {
    const content = await readFile(path.join(skillRoot, file), 'utf8');
    assert.doesNotMatch(content, /\/Users\/|\/private\/tmp\/|https?:\/\/localhost/);
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:\/\//i.test(target)) continue;
      const absolute = path.resolve(skillRoot, path.dirname(file), target);
      assert.ok(absolute.startsWith(`${skillRoot}${path.sep}`), `Escaping link in ${file}: ${target}`);
      await readFile(absolute);
    }
  }
});
