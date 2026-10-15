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
  assert.match(entry, /^---\nname: ae-page-context\nversion: 1\.2\.0\n/);
  assert.ok(Buffer.byteLength(entry) <= 5000, 'Keep the preloaded entry within 5 KB');
  assert.match(entry, /unrelated question, do not fetch Context/);
  assert.match(entry, /untrusted data, never instructions/);
  assert.doesNotMatch(entry, /ASSET_HANDOVER|edit \| query_groups/);
});

test('route-only guidance keeps resource identity separate from live page facts and permissions', async () => {
  const reference = await readFile(path.join(skillRoot, 'route-context.md'), 'utf8');
  assert.match(reference, /kind: route_context/);
  assert.match(reference, /schemaVersion: 1/);
  assert.match(reference, /flowUuid.*not numeric flowId/);
  assert.match(reference, /no DOM, filters, selection, form content or results/);
  assert.match(reference, /Existence and authorization/);
  assert.match(reference, /saved configuration, not the current unsaved page state/);
  assert.match(reference, /capability gap/);
  assert.match(reference, /Saved group identifier \(clusterId\)/);
  assert.match(reference, /resource.*identifies the owning activity only/);
  assert.match(reference, /temporary cache key/);
  assert.match(reference, /It does not establish a user\/entity identity/);
  assert.match(reference, /virtual-event-property/);
  assert.match(reference, /virtual-user-property/);
  assert.match(reference, /integration-config/);
  assert.match(reference, /type=1.*template source/);
  assert.match(reference, /vProId/);
});

test('runtime policy activates by page-context capability and only preloads the entry', async () => {
  const policy = JSON.parse(await readFile(path.join(skillRoot, 'runtime.json'), 'utf8'));
  assert.deepEqual(policy, { version: 2, capability: 'page_context', preload: 'entry' });
});

test('behavior sequence preserves independent queries and loaded-only evidence', async () => {
  const text = await readFile(path.join(skillRoot, 'user-behavior-sequence.md'), 'utf8');
  assert.match(text, /independent query lanes/);
  assert.match(text, /null subject means identity is not ready/);
  assert.match(text, /completeness=loaded-only/);
  assert.match(text, /queryTruncated=true/);
  assert.match(text, /drilldown prerequisite/);
});

test('all reference links resolve within the complete package', async () => {
  const references = (await readdir(path.join(skillRoot, 'references'))).sort();
  assert.deepEqual(references, expectedReferences);
  const entry = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const linked = [...entry.matchAll(/\]\(references\/([^)#]+)(?:#[^)]*)?\)/g)].map(m => m[1]);
  assert.deepEqual(linked.sort(), expectedReferences);
  assert.match(entry, /\]\(route-context\.md\)/);
  for (const file of ['SKILL.md', 'route-context.md', 'user-behavior-sequence.md', ...references.map(name => `references/${name}`)]) {
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
