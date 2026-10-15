import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const scriptRoot = path.resolve(import.meta.dirname, '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki');
const builder = path.join(scriptRoot, 'build-empty-skeleton.mjs');
const packager = path.join(scriptRoot, 'package-wiki-source-zip.mjs');

test('empty governed sources compile into a refreshable skeleton without broadening scope', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pskb-empty-'));
  try {
    const source = path.join(temp, 'package');
    fs.mkdirSync(path.join(source, 'indexes'), { recursive: true });
    fs.mkdirSync(path.join(source, 'sources'), { recursive: true });
    const policy = { authenticated_entry_assets_only: true, dependency_closure: true };
    fs.writeFileSync(path.join(source, '.asset-package.json'), JSON.stringify({
      schema_version: '3.0', project_id: 51, project_name: 'New project',
      snapshot_hash: 'a'.repeat(64), asset_scope: 'governed',
      truncated: false, filter_policy: policy,
    }));
    fs.writeFileSync(path.join(source, 'manifest.json'), JSON.stringify({
      schema_version: '3.0', project_id: 51, asset_scope: 'governed',
      truncated: false, filter_policy: policy,
    }));
    for (const name of ['dashboard-catalog', 'report-catalog', 'metric-catalog']) {
      fs.writeFileSync(path.join(source, 'indexes', `${name}.jsonl`), '');
    }
    fs.writeFileSync(path.join(source, 'sources', 'adopted-personal-semantics.jsonl'), '');

    const output = path.join(temp, 'skeleton');
    const result = JSON.parse(execFileSync(process.execPath, [builder,
      '--asset-package', source, '--output', output], { encoding: 'utf8' }));
    assert.equal(result.source_count, 7);
    assert.ok(fs.statSync(result.archive).size > 0);
    const manifest = JSON.parse(fs.readFileSync(result.manifest, 'utf8'));
    assert.equal(manifest.navigation_taxonomy_version, 'empty-skeleton-1.0');
    assert.equal(manifest.semantic_project_id, 51);
    const overview = fs.readFileSync(path.join(result.source_tree,
      'sources/project/pskb-p51-wiki-project-overview.md'), 'utf8');
    assert.match(overview, /Business positioning.*not established/);
    assert.doesNotMatch(overview, /all_visible/);
    const refreshState = path.join(result.source_tree, 'sources/project/pskb-p51-refresh-state.md');
    const state = fs.readFileSync(refreshState, 'utf8');
    assert.match(state, /pskb_refresh_state_index/);

    const nextFlat = path.join(temp, 'next-flat');
    fs.cpSync(path.join(output, 'flat'), nextFlat, { recursive: true });
    const nextManifest = JSON.parse(fs.readFileSync(path.join(nextFlat, 'kb-upload-manifest.json'), 'utf8'));
    nextManifest.navigation_taxonomy_version = '2.0';
    fs.writeFileSync(path.join(nextFlat, 'kb-upload-manifest.json'), JSON.stringify(nextManifest));
    const diff = JSON.parse(execFileSync(process.execPath, [packager,
      '--source-dir', nextFlat, '--tree-output', path.join(temp, 'next-tree'),
      '--manifest-output', path.join(temp, 'next-manifest.json'),
      '--previous-refresh-state', refreshState], { encoding: 'utf8' }));
    assert.equal(diff.compile_mode, 'full');
    assert.equal(diff.navigation_taxonomy_migration.requires_schema_force, false);
    assert.equal(diff.navigation_taxonomy_migration.requires_schema_review, true);

    fs.writeFileSync(path.join(source, 'indexes', 'dashboard-catalog.jsonl'),
      JSON.stringify({ resource_key: 'dashboard:1', authenticated: true }) + '\n');
    const rejected = spawnSync(process.execPath, [builder,
      '--asset-package', source, '--output', path.join(temp, 'should-fail')], { encoding: 'utf8' });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /not empty/);

    fs.writeFileSync(path.join(source, 'indexes', 'dashboard-catalog.jsonl'), '');
    fs.writeFileSync(path.join(source, 'sources', 'adopted-personal-semantics.jsonl'),
      JSON.stringify({ source_id: 'personal-semantic:1', context_type: 'background' }) + '\n');
    const personalOnly = spawnSync(process.execPath, [builder,
      '--asset-package', source, '--output', path.join(temp, 'personal-only')], { encoding: 'utf8' });
    assert.notEqual(personalOnly.status, 0);
    assert.match(personalOnly.stderr, /empty skeleton is not applicable/);
    fs.writeFileSync(path.join(source, 'sources', 'adopted-personal-semantics.jsonl'), '');
    const allVisible = JSON.parse(fs.readFileSync(path.join(source, '.asset-package.json'), 'utf8'));
    allVisible.asset_scope = 'all_visible';
    fs.writeFileSync(path.join(source, '.asset-package.json'), JSON.stringify(allVisible));
    const broadScope = spawnSync(process.execPath, [builder,
      '--asset-package', source, '--output', path.join(temp, 'broad-scope')], { encoding: 'utf8' });
    assert.notEqual(broadScope.status, 0);
    assert.match(broadScope.stderr, /governed schema 3.0 package/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
