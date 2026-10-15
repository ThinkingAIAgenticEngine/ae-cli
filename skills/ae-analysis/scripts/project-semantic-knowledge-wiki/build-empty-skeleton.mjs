#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeSourceForHash } from './precompiled-source.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, part, index, all) => {
  if (part.startsWith('--') && all[index + 1] && !all[index + 1].startsWith('--')) {
    pairs.push([part.slice(2), all[index + 1]]);
  }
  return pairs;
}, []));
const packageRoot = path.resolve(required('asset-package'));
const outputRoot = path.resolve(required('output'));
const descriptor = readJson(path.join(packageRoot, '.asset-package.json'));
const manifest = readJson(path.join(packageRoot, 'manifest.json'));
const projectId = Number(descriptor.project_id ?? manifest.project_id);
const projectName = String(args['project-name'] || descriptor.project_name || manifest.project_name || '')
  .replace(/\s+/g, ' ').trim();
const snapshotHash = String(descriptor.snapshot_hash ?? manifest.snapshot_hash ?? '');
const scope = String(descriptor.asset_scope ?? manifest.asset_scope ?? '');
const policy = descriptor.filter_policy ?? manifest.filter_policy ?? {};
if (String(descriptor.schema_version ?? manifest.schema_version) !== '3.0'
    || descriptor.truncated === true || manifest.truncated === true
    || scope !== 'governed' || policy.authenticated_entry_assets_only !== true
    || policy.dependency_closure !== true || !Number.isSafeInteger(projectId) || projectId < 1
    || !projectName || !/^[0-9a-f]{64}$/i.test(snapshotHash)) {
  throw new Error('A complete governed schema 3.0 package with valid project identity is required.');
}
for (const name of ['dashboard-catalog', 'report-catalog', 'metric-catalog']) {
  if (readJsonl(path.join(packageRoot, 'indexes', `${name}.jsonl`)).length) {
    throw new Error(`The ${name} is not empty; use the normal semantic Wiki builder.`);
  }
}
if (readJsonl(path.join(packageRoot, 'sources', 'adopted-personal-semantics.jsonl')).length) {
  throw new Error('Adopted personal semantics are present; the empty skeleton is not applicable.');
}
if (fs.existsSync(outputRoot)) throw new Error('Output already exists.');
const flatRoot = path.join(outputRoot, 'flat');
fs.mkdirSync(flatRoot, { recursive: true });
const namespace = `pskb-p${projectId}`;
const facts = [
  ['index', 'index', 'index.md', `# ${projectName} project semantic knowledge base\n\n- Project overview: project identity and current evidence boundary.\n- Shared project knowledge: no verified shared facts yet.\n- Business domains: none established from governed sources yet.\n- Event and asset catalog: no certified entry assets yet.\n- Governance and provenance: source scope and update policy.\n\nThis is an empty knowledge skeleton. It does not establish business facts or authorize use of uncertified assets.\n`],
  ['wiki-project-overview', 'wiki-page', 'wiki/project-overview.md', `# Project overview\n\nProject: ${projectName} (ID ${projectId}). Business positioning, audience, objects, relationships, and decision paths are not established by the current governed sources. Add verified project material before using this knowledge base for business conclusions.\n`],
  ['common-index', 'common', 'wiki/common/index.md', '# Shared project knowledge\n\nNo verified project-wide knowledge is available yet. Human-authored material may be added under the project and business source directories with provenance and scope.\n'],
  ['domain-index', 'domain', 'wiki/domains/index.md', '# Business domains\n\nNo business domain is established by the current governed sources. Do not infer domains from project names or unverified assets.\n'],
  ['asset-index-index', 'asset-index', 'wiki/asset-index/index.md', '# Event and asset catalog\n\nNo certified entry asset is available in this governed snapshot. Do not switch to all visible assets without an explicit user request.\n'],
  ['governance-index', 'governance', 'wiki/governance/index.md', `# Governance and provenance\n\nProject ID: ${projectId}. Source scope: governed. Certified entry assets: 0. Adopted personal semantics: 0. Business facts remain unknown until verified sources are added. A later refresh must replace this empty-source state when governed evidence becomes available and preserve unrelated human sources.\n`],
];
const refreshState = {
  schema_version: '1.0',
  empty_skeleton: true,
  semantic_project_id: projectId,
  source_snapshot_hash: snapshotHash,
};
facts.push(['refresh-state', 'refresh-state', 'refresh-state.md',
  `# Project semantic refresh state\n\n<!-- pskb_refresh_state_base64\n${Buffer.from(JSON.stringify(refreshState)).toString('base64url')}\n-->\n`]);
const sources = facts.map(([stem, sourceKind, sourcePath, content]) => {
  const file = `${namespace}-${stem}.md`;
  fs.writeFileSync(path.join(flatRoot, file), content);
  return {
    display_name: file, file, namespace, snapshot_hash: snapshotHash,
    source_kind: sourceKind, asset_type: null, asset_key: null,
    title: content.split('\n')[0].replace(/^# /, ''), source_path: sourcePath,
    content_hash: createHash('sha256').update(normalizeSourceForHash(content)).digest('hex'),
    semantic_plan_fragment_refs: [],
  };
});
fs.writeFileSync(path.join(flatRoot, 'kb-upload-manifest.json'), JSON.stringify({
  schema_version: '1.0',
  manifest_kind: 'ae_project_semantic_kb_upload_sources',
  navigation_taxonomy_version: 'empty-skeleton-1.0',
  namespace,
  semantic_project_id: projectId,
  project_name: projectName,
  snapshot_hash: snapshotHash,
  semantic_plan_state: { schema_version: null, plan_hash: null, fragment_count: 0, fragments: [] },
  source_count: sources.length,
  sources,
}, null, 2));
const packager = path.join(import.meta.dirname, 'package-wiki-source-zip.mjs');
const archive = path.join(outputRoot, 'empty-skeleton.zip');
const tree = path.join(outputRoot, 'source-tree');
const sourceManifest = path.join(outputRoot, 'source-tree-manifest.json');
execFileSync(process.execPath, [packager, '--source-dir', flatRoot, '--tree-output', tree,
  '--manifest-output', sourceManifest, '--output', archive, '--embed-refresh-state-baseline'], {
  stdio: 'pipe',
});
process.stdout.write(JSON.stringify({
  project_id: projectId, project_name: projectName, archive,
  source_tree: tree, manifest: sourceManifest, source_count: sources.length,
}, null, 2) + '\n');

function required(name) {
  if (!args[name]) throw new Error(`--${name} is required.`);
  return args[name];
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function readJsonl(file) {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  return rows.filter((row) => row.record_type !== 'header');
}
