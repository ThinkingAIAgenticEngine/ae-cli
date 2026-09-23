#!/usr/bin/env node
import fs from 'node:fs';
import { normalizeSourceForHash } from './precompiled-source.mjs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';

const args = parseArgs(process.argv.slice(2));
const sourceDir = path.resolve(required('source-dir'));
const sourceRoot = fs.realpathSync(sourceDir);
const treeOutput = path.resolve(args['tree-output'] || `${sourceDir}-source-tree`);
const outputArchive = args.output ? path.resolve(args.output) : '';
const previousManifestPath = args['previous-manifest'] ? path.resolve(args['previous-manifest']) : '';
const manifestOutput = path.resolve(args['manifest-output'] || path.join(treeOutput, 'kb-source-tree-manifest.json'));
const force = Boolean(args.force);
const rootPath = normalizeRootPath(args['root-path'] || 'sources');

if (!outputArchive && !previousManifestPath) throw new Error('--output or --previous-manifest is required.');
assertOutputPath(treeOutput, sourceRoot, 'Tree output');
if (outputArchive) assertOutputPath(outputArchive, sourceRoot, 'Archive');
if (manifestOutput.startsWith(`${sourceRoot}${path.sep}`)) throw new Error('Manifest output must not be nested inside the flat source directory.');

const flatManifest = readManifest(path.join(sourceRoot, 'kb-upload-manifest.json'), { allowFlat: true });
const next = buildSourceTreeManifest(flatManifest, { requireLocalContent: true });
const entries = buildSourceTreeEntries(next);

materializeTree(treeOutput, force, (staging) => {
  for (const entry of entries) writeText(path.join(staging, entry.path), entry.content);
});
writeJson(manifestOutput, next, force);

const result = {
  manifest_kind: next.manifest_kind,
  namespace: next.namespace,
  root_path: next.root_path,
  source_count: next.source_count,
  tree_output: treeOutput,
  manifest: manifestOutput,
};

if (previousManifestPath) {
  const previous = buildSourceTreeManifest(readManifest(previousManifestPath, { allowFlat: true, allowTree: true }), { requireLocalContent: false });
  if (previous.namespace !== next.namespace || previous.semantic_project_id !== next.semantic_project_id) {
    throw new Error('Wiki namespace/project changed; stop.');
  }
  const before = new Map(previous.sources.map((source) => [source.file, source]));
  const after = new Map(next.sources.map((source) => [source.file, source]));
  const actions = [];
  const unchanged = [];
  for (const source of next.sources) {
    const old = before.get(source.file);
    if (old?.content_hash === source.content_hash) unchanged.push(source.file);
    else actions.push({
      action: old ? 'replace' : 'add',
      path: source.file,
      file: path.join(treeOutput, source.file),
      source_kind: source.source_kind,
      asset_type: source.asset_type,
      asset_key: source.asset_key,
      content_hash: source.content_hash,
      previous_content_hash: old?.content_hash ?? null,
    });
  }
  for (const source of previous.sources) {
    if (!after.has(source.file)) actions.push({
      action: 'remove',
      path: source.file,
      source_kind: source.source_kind,
      asset_type: source.asset_type,
      asset_key: source.asset_key,
      previous_content_hash: source.content_hash,
    });
  }
  Object.assign(result, { actions, unchanged, compile_mode: actions.length ? 'incremental' : 'skip' });
}

if (outputArchive) {
  if (fs.existsSync(outputArchive) && !force) throw new Error('Archive already exists. Pass --force to replace it.');
  const archiveEntries = next.sources.map((source) => ({
    name: source.file,
    content: fs.readFileSync(path.join(treeOutput, source.file)),
  })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  await writeZip(outputArchive, archiveEntries);
  Object.assign(result, { archive: outputArchive, archive_bytes: fs.statSync(outputArchive).size });
}

console.log(JSON.stringify(result, null, 2));

function buildSourceTreeManifest(manifest, options) {
  if (manifest.manifest_kind === 'ae_project_semantic_kb_source_tree') return validateTreeManifest(manifest);

  const flatSources = manifest.sources.map((source) => normalizeFlatSource(manifest, source, options.requireLocalContent));
  const flatToTree = new Map(flatSources.map((source) => [source.display_name, sourceTreePath(source)]));
  const generated = flatSources.map((source) => {
    const content = options.requireLocalContent
      ? rewriteLinksForTree(readText(path.join(sourceRoot, source.file)), source.display_name, flatToTree)
      : null;
    return {
      display_name: source.display_name,
      file: flatToTree.get(source.display_name),
      namespace: manifest.namespace,
      snapshot_date: manifest.snapshot_date ?? null,
      snapshot_hash: manifest.snapshot_hash,
      source_kind: source.source_kind,
      asset_type: source.asset_type,
      asset_key: source.asset_key,
      title: source.title,
      content_hash: content == null ? source.content_hash : sha256(normalizeContentForHash(content)),
      source_path: source.source_path,
      managed_by: 'project-semantic-kb-source-tree',
    };
  });
  const readmes = sourceDirectoryReadmes(manifest).map((entry) => ({
    display_name: entry.path,
    file: entry.path,
    namespace: manifest.namespace,
    snapshot_date: manifest.snapshot_date ?? null,
    snapshot_hash: manifest.snapshot_hash,
    source_kind: 'filing-guide',
    asset_type: null,
    asset_key: null,
    content_hash: sha256(normalizeContentForHash(entry.content)),
    source_path: entry.path,
    managed_by: 'project-semantic-kb-source-tree',
  }));
  const sources = [...readmes, ...generated].sort((a, b) => a.file.localeCompare(b.file, 'en'));
  assertUnique(sources.map((source) => source.file), 'source tree path');
  return {
    schema_version: '1.1',
    manifest_kind: 'ae_project_semantic_kb_source_tree',
    namespace: manifest.namespace,
    semantic_project_id: manifest.semantic_project_id,
    project_name: manifest.project_name ?? null,
    root_path: rootPath,
    snapshot_date: manifest.snapshot_date ?? null,
    snapshot_hash: manifest.snapshot_hash ?? null,
    source_count: sources.length,
    generated_source_count: generated.length,
    filing_guide_count: readmes.length,
    sources,
  };
}

function buildSourceTreeEntries(manifest) {
  const flatToTree = new Map(manifest.sources
    .filter((item) => item.source_kind !== 'filing-guide')
    .map((item) => [item.display_name, item.file]));
  const guides = new Map(sourceDirectoryReadmes(manifest).map((entry) => [entry.path, entry.content]));
  return manifest.sources.map((source) => {
    if (source.source_kind === 'filing-guide') {
      const content = guides.get(source.file);
      if (!content) throw new Error(`Missing filing guide content for ${source.file}.`);
      return { path: source.file, content };
    }
    return {
      path: source.file,
      content: rewriteLinksForTree(readText(path.join(sourceRoot, source.display_name)), source.display_name, flatToTree),
    };
  });
}

function sourceDirectoryReadmes(manifest) {
  const project = clean(manifest.project_name) || `Project ${manifest.semantic_project_id}`;
  const lines = [
    [`${rootPath}/README.md`, `# Source Directory\n\nThis directory is the writable source space for ${project} project knowledge. README files are filing guides only; they are not business evidence.\n\nPut source material by nature. CLI-managed asset facts live under assets/. Human context such as project background, meetings, decisions, corrections, and references must not be removed by an asset refresh.\n\nThe expected compiled Wiki should be organized for consumption: index.md, wiki/project/, wiki/domains/, wiki/semantics/, wiki/assets/, wiki/decisions/, and wiki/review/.\n`],
    [`${rootPath}/project/README.md`, '# Project Sources\n\nBackground, goals, business scope, terminology, and ownership notes. This guide is not evidence.\n'],
    [`${rootPath}/assets/README.md`, '# Asset Sources\n\nCLI-managed structured asset facts. Refresh may change files owned by the project semantic asset package only.\n'],
    [`${rootPath}/assets/dashboards/README.md`, '# Dashboard Asset Sources\n\nDashboard facts exported by CLI.\n'],
    [`${rootPath}/assets/reports/README.md`, '# Report Asset Sources\n\nReport facts exported by CLI, including calculation, filters, parameters, SQL, provenance, and authority status when available.\n'],
    [`${rootPath}/assets/metrics/README.md`, '# Metric Asset Sources\n\nReusable metric facts exported by CLI.\n'],
    [`${rootPath}/assets/metadata/README.md`, '# Metadata Asset Sources\n\nEvents, properties, tags, cohorts, and other selectable metadata facts exported by CLI.\n'],
    [`${rootPath}/business/README.md`, '# Business Sources\n\nBusiness rules, metric definitions, domain context, process notes, and user-facing question patterns.\n'],
    [`${rootPath}/meetings/README.md`, '# Meeting Sources\n\nMeeting notes and discussion records. They can provide context, but do not override confirmed decisions by recency alone.\n'],
    [`${rootPath}/decisions/README.md`, '# Decision Sources\n\nConfirmed decisions must state confirmer, status, date, and applicable scope.\n'],
    [`${rootPath}/corrections/README.md`, '# Correction Sources\n\nCorrections must identify the target material, corrected content, reason, date, and applicable scope.\n'],
    [`${rootPath}/references/README.md`, '# Reference Sources\n\nSupporting documents, external explanations, source containers, appendices, and audit material.\n'],
  ];
  return lines.map(([pathValue, content]) => ({ path: pathValue, content }));
}

function sourceTreePath(source) {
  const base = sourceTreeBaseName(source);
  const kind = source.source_kind;
  const assetType = source.asset_type;
  if (assetType === 'dashboard') return `${rootPath}/assets/dashboards/${base}`;
  if (assetType === 'report') return `${rootPath}/assets/reports/${base}`;
  if (assetType === 'metric') return `${rootPath}/assets/metrics/${base}`;
  if (assetType === 'metadata' || kind === 'metadata') return `${rootPath}/assets/metadata/${base}`;
  if (kind === 'domain' || kind === 'recall-card') return `${rootPath}/business/${base}`;
  if (kind === 'index' || kind === 'manifest') return `${rootPath}/project/${base}`;
  if (kind === 'governance') return `${rootPath}/references/governance/${base}`;
  if (kind === 'appendix' || kind === 'source-container') return `${rootPath}/references/${base}`;
  return `${rootPath}/references/${base}`;
}

function sourceTreeBaseName(source) {
  const original = path.posix.basename(source.file);
  if (!source.asset_key) return original;
  const titlePart = slug(clean(source.title));
  const keyPart = slug(clean(source.asset_key));
  const prefix = `${clean(source.namespace)}-${clean(source.asset_type || source.source_kind)}`;
  const stem = [prefix, titlePart, keyPart].filter(Boolean).join('-');
  if (!titlePart || original.includes(`-${titlePart}-`)) return original;
  return `${stem.length <= 150 ? stem : `${stem.slice(0, 125)}-${sha256(stem).slice(0, 16)}`}.md`;
}

function slug(value) {
  return clean(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

function rewriteLinksForTree(content, currentFlatName, flatToTree) {
  const currentTreePath = flatToTree.get(currentFlatName);
  if (!currentTreePath) return content;
  return content.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, label, target) => {
    const [targetPath, fragment = ''] = String(target).split('#');
    if (!targetPath || /^(https?:|mailto:)/.test(targetPath)) return match;
    const treeTarget = flatToTree.get(decodeURIComponent(targetPath));
    if (!treeTarget) return match;
    const relative = path.posix.relative(path.posix.dirname(currentTreePath), treeTarget) || path.posix.basename(treeTarget);
    return `[${label}](${relative}${fragment ? `#${fragment}` : ''})`;
  });
}

function readManifest(file, options) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const kind = manifest.manifest_kind;
  if (kind === 'ae_project_semantic_kb_upload_sources' && options.allowFlat) return validateFlatManifest(manifest);
  if (kind === 'ae_project_semantic_kb_source_tree' && options.allowTree) return validateTreeManifest(manifest);
  throw new Error(`Unsupported manifest kind: ${kind || '<missing>'}.`);
}

function validateFlatManifest(manifest) {
  if (!manifest.namespace || !Array.isArray(manifest.sources)) throw new Error('Invalid Wiki upload manifest.');
  const seen = new Set();
  for (const source of manifest.sources) {
    normalizeFlatSource(manifest, source, false);
    if (seen.has(source.file)) throw new Error('Duplicate flat source file.');
    seen.add(source.file);
  }
  if (!seen.size) throw new Error('No Wiki sources.');
  return manifest;
}

function normalizeFlatSource(manifest, source, requireLocalFile) {
  const name = source.file;
  if (typeof name !== 'string' || name !== source.display_name || !name.startsWith(`${manifest.namespace}-`)
      || !name.endsWith('.md') || /[\\/\x00-\x1f]/.test(name) || !/^[a-f0-9]{64}$/i.test(source.content_hash)) {
    throw new Error('Invalid Wiki source identity/hash.');
  }
  if (requireLocalFile) {
    const file = fs.realpathSync(path.join(sourceRoot, name));
    if (!file.startsWith(`${sourceRoot}${path.sep}`)) throw new Error('Source escapes the Wiki directory.');
  }
  return {
    ...source,
    namespace: clean(source.namespace) || manifest.namespace,
    source_kind: clean(source.source_kind) || 'wiki-page',
    asset_type: clean(source.asset_type) || null,
    asset_key: clean(source.asset_key) || null,
    title: clean(source.title) || clean(source.display_name).replace(/\.md$/i, ''),
    source_path: clean(source.source_path),
  };
}

function validateTreeManifest(manifest) {
  if (!manifest.namespace || !Array.isArray(manifest.sources) || clean(manifest.root_path) !== rootPath) {
    throw new Error('Invalid source tree manifest.');
  }
  const seen = new Set();
  for (const source of manifest.sources) {
    if (typeof source.file !== 'string' || !source.file.startsWith(`${rootPath}/`) || !source.file.endsWith('.md')
        || source.file.includes('\\') || source.file.split('/').some((part) => !part || part === '.' || part === '..')
        || !/^[a-f0-9]{64}$/i.test(source.content_hash) || seen.has(source.file)) {
      throw new Error('Invalid or duplicate source tree path/hash.');
    }
    seen.add(source.file);
  }
  return manifest;
}

function normalizeContentForHash(content) { return normalizeSourceForHash(String(content).replace(/\r\n/g, '\n')); }

function parseArgs(tokens) {
  const parsed = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const key = tokens[i];
    if (!key.startsWith('--')) throw new Error(`Invalid argument: ${key}`);
    const name = key.slice(2);
    if (name === 'force') {
      parsed[name] = true;
      continue;
    }
    const value = tokens[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
    parsed[name] = value;
  }
  return parsed;
}

function required(name) {
  const value = args[name];
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

function normalizeRootPath(value) {
  const normalized = clean(value).replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('\\') || normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('--root-path must be a normalized relative path.');
  }
  return normalized;
}

function assertOutputPath(target, source, label) {
  if (target === source || target.startsWith(`${source}${path.sep}`)) throw new Error(`${label} must not be nested inside the flat source directory.`);
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function materializeTree(output, replace, writer) {
  if (fs.existsSync(output) && !replace) throw new Error(`Tree output already exists: ${output}. Pass --force to replace it.`);
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  const staging = path.join(parent, `.${path.basename(output)}.staging-${process.pid}-${randomBytes(4).toString('hex')}`);
  const backup = path.join(parent, `.${path.basename(output)}.backup-${process.pid}-${randomBytes(4).toString('hex')}`);
  fs.mkdirSync(staging, { recursive: true });
  try {
    writer(staging);
    if (fs.existsSync(output)) fs.renameSync(output, backup);
    fs.renameSync(staging, output);
    fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    if (!fs.existsSync(output) && fs.existsSync(backup)) fs.renameSync(backup, output);
    throw error;
  }
}

async function writeZip(output, files) {
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  const temporary = path.join(parent, `.${path.basename(output)}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`);
  const archiver = createRequire(import.meta.url)('archiver');
  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(temporary, { flags: 'wx' });
    const zip = typeof archiver === 'function' ? archiver('zip', { zlib: { level: 9 } }) : new archiver.ZipArchive({ zlib: { level: 9 } });
    stream.on('close', resolve);
    stream.on('error', reject);
    zip.on('error', reject);
    zip.pipe(stream);
    for (const file of files) zip.append(file.content, { name: file.name, date: new Date('1980-01-01T00:00:00Z'), mode: 0o600 });
    void zip.finalize();
  });
  if (fs.existsSync(output)) fs.rmSync(output, { force: true });
  fs.renameSync(temporary, output);
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function writeJson(file, value, replace) {
  if (fs.existsSync(file) && !replace) throw new Error(`Manifest output already exists: ${file}. Pass --force to replace it.`);
  writeText(file, JSON.stringify(value, null, 2));
}

function readText(file) { return fs.readFileSync(file, 'utf8'); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
