#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const nextManifestPath = path.resolve(required(args, 'next-manifest'));
const previousManifestPath = clean(args['previous-manifest']) ? path.resolve(args['previous-manifest']) : null;
const remoteSourcesPath = clean(args['remote-sources']) ? path.resolve(args['remote-sources']) : null;

const nextManifest = readJson(nextManifestPath);
const previousManifest = previousManifestPath ? readJson(previousManifestPath) : null;
const remoteSources = remoteSourcesPath ? readJson(remoteSourcesPath) : null;
const namespace = clean(args.namespace || nextManifest.namespace);
const fullThreshold = parseRatio(args['full-threshold'], 0.2);
const maxIncrementalActions = parsePositiveInteger(args['max-incremental-actions'], 50);

if (!namespace) fail('A namespace is required. Pass --namespace or use a next manifest with namespace.');
if (clean(nextManifest.namespace) !== namespace) fail(`Next manifest namespace ${clean(nextManifest.namespace) || '<empty>'} does not match ${namespace}.`);
if (previousManifest && clean(previousManifest.namespace) !== namespace) {
  fail(`Previous manifest namespace ${clean(previousManifest.namespace) || '<empty>'} does not match ${namespace}.`);
}

const nextSources = sourceMap(nextManifest);
const previousSources = previousManifest ? sourceMap(previousManifest) : new Map();
const remoteSourceMap = remoteSources ? listRemoteSources(remoteSources, namespace) : new Map();
const baselineSources = buildBaselineSources(previousSources, remoteSourceMap, Boolean(previousManifest));

const added = [];
const updated = [];
const removed = [];
const unchanged = [];

for (const [displayName, source] of nextSources) {
  const previous = baselineSources.get(displayName);
  if (!previous) {
    added.push(addAction(source));
  } else if (previous.content_hash && previous.content_hash === source.content_hash) {
    unchanged.push(unchangedAction(source, previous));
  } else if (previous.content_hash) {
    updated.push(updateAction(source, previous));
  } else if (previousManifest) {
    updated.push(updateAction(source, previous));
  } else {
    added.push(addAction(source));
  }
}

for (const [displayName, source] of baselineSources) {
  if (!nextSources.has(displayName)) removed.push(removeAction(source));
}

const actions = [
  ...removed.map((source) => ({ action: 'remove', ...source })),
  ...updated.map((source) => ({ action: 'replace', ...source })),
  ...added.map((source) => ({ action: 'add', ...source })),
];

const compileDecision = decideCompileMode({
  actionCount: actions.length,
  baselineCount: baselineSources.size,
  nextCount: nextSources.size,
  fullThreshold,
  maxIncrementalActions,
  args,
});
process.stdout.write(`${JSON.stringify({
  schema_version: '1.0',
  plan_kind: 'ae_project_semantic_kb_source_sync_plan',
  namespace,
  previous_snapshot_hash: previousManifest?.snapshot_hash ?? null,
  next_snapshot_hash: nextManifest.snapshot_hash ?? null,
  remote_source_count: remoteSourceMap.size,
  counts: {
    added: added.length,
    updated: updated.length,
    removed: removed.length,
    unchanged: unchanged.length,
  },
  change_ratio: compileDecision.changeRatio,
  full_threshold: fullThreshold,
  max_incremental_actions: maxIncrementalActions,
  compile_mode: compileDecision.mode,
  compile_mode_reason: compileDecision.reason,
  requires_schema_force: compileDecision.requiresSchemaForce,
  schema_force_reasons: compileDecision.schemaForceReasons,
  added,
  updated,
  removed,
  unchanged,
  actions,
}, null, 2)}\n`);

function sourceMap(manifest) {
  const values = asArray(manifest.sources);
  const result = new Map();
  for (const value of values) {
    const source = normalizeSource(value);
    if (!source.display_name.startsWith(`${namespace}-`)) fail(`Source ${source.display_name} is outside namespace ${namespace}.`);
    if (result.has(source.display_name)) fail(`Duplicate source display_name: ${source.display_name}.`);
    result.set(source.display_name, source);
  }
  return result;
}

function listRemoteSources(value, sourceNamespace) {
  const rows = Array.isArray(value) ? value : asArray(value.sources || value.data?.sources || value.data?.items || value.items);
  const result = new Map();
  for (const row of rows) {
    const displayName = clean(row.display_name || row.displayName || row.name || row.filename);
    if (!displayName || !displayName.startsWith(`${sourceNamespace}-`)) continue;
    result.set(displayName, {
      display_name: displayName,
      source_id: clean(row.id || row.source_id || row.sourceId) || null,
      content_hash: clean(row.content_hash || row.contentHash) || null,
      source_path: clean(row.source_path || row.sourcePath) || null,
      raw: row,
    });
  }
  return result;
}

function buildBaselineSources(previousSources, remoteSources, hasPreviousManifest) {
  if (!hasPreviousManifest) return remoteSources;
  const result = new Map(previousSources);
  for (const [displayName, remote] of remoteSources) {
    const previous = result.get(displayName);
    if (previous) result.set(displayName, { ...previous, source_id: remote.source_id ?? previous.source_id ?? null, remote });
    else result.set(displayName, remote);
  }
  return result;
}

function addAction(source) {
  return {
    display_name: source.display_name,
    file: source.file,
    content_hash: source.content_hash,
    source_path: source.source_path,
    source_kind: source.source_kind,
    asset_type: source.asset_type,
    asset_key: source.asset_key,
  };
}

function updateAction(source, previous) {
  return {
    ...addAction(source),
    previous_content_hash: previous.content_hash ?? null,
    source_id: previous.source_id ?? null,
  };
}

function removeAction(source) {
  return {
    display_name: source.display_name,
    source_id: source.source_id ?? null,
    previous_content_hash: source.content_hash ?? null,
    source_path: source.source_path ?? null,
  };
}

function unchangedAction(source, previous) {
  return {
    display_name: source.display_name,
    content_hash: source.content_hash,
    source_id: previous.source_id ?? null,
    source_path: source.source_path,
  };
}

function normalizeSource(value) {
  const source = asObject(value);
  const displayName = clean(source.display_name || source.displayName);
  if (!displayName) fail('Every manifest source requires display_name.');
  return {
    display_name: displayName,
    file: clean(source.file || source.local_path || source.localPath || displayName),
    content_hash: clean(source.content_hash || source.contentHash),
    source_path: clean(source.source_path || source.sourcePath),
    source_kind: clean(source.source_kind || source.sourceKind),
    asset_type: clean(source.asset_type || source.assetType) || null,
    asset_key: clean(source.asset_key || source.assetKey) || null,
  };
}

function decideCompileMode({ actionCount, baselineCount, nextCount, fullThreshold, maxIncrementalActions, args: parsedArgs }) {
  const denominator = Math.max(baselineCount, nextCount, 1);
  const changeRatio = Number((actionCount / denominator).toFixed(6));
  if (actionCount === 0) {
    return {
      mode: 'skip',
      reason: 'no_source_changes',
      changeRatio,
      requiresSchemaForce: false,
      schemaForceReasons: [],
    };
  }

  const forceReasons = [];
  if (boolArg(parsedArgs['force-full'])) forceReasons.push('force_full');
  if (boolArg(parsedArgs['semantic-plan-changed'])) forceReasons.push('semantic_plan_changed');
  if (boolArg(parsedArgs['schema-changed'])) forceReasons.push('schema_changed');
  if (boolArg(parsedArgs['compile-guidance-changed'])) forceReasons.push('compile_guidance_changed');
  if (boolArg(parsedArgs['recall-card-contract-changed'])) forceReasons.push('recall_card_contract_changed');
  if (boolArg(parsedArgs['page-taxonomy-changed'])) forceReasons.push('page_taxonomy_changed');
  if (changeRatio > fullThreshold) forceReasons.push('change_ratio_exceeded');
  if (actionCount > maxIncrementalActions) forceReasons.push('max_incremental_actions_exceeded');

  if (forceReasons.length) {
    return {
      mode: 'full',
      reason: forceReasons[0],
      changeRatio,
      requiresSchemaForce: true,
      schemaForceReasons: forceReasons,
    };
  }

  return {
    mode: 'incremental',
    reason: 'small_source_delta',
    changeRatio,
    requiresSchemaForce: false,
    schemaForceReasons: [],
  };
}

function parseArgs(values) {
  const out = {};
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (!value.startsWith('--')) fail(`Unexpected argument: ${value}`);
    const next = values[i + 1];
    if (next == null || next.startsWith('--')) out[value.slice(2)] = true;
    else out[value.slice(2)] = values[++i];
  }
  return out;
}

function required(values, key) {
  const value = clean(values[key]);
  if (!value) fail(`--${key} is required.`);
  return value;
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function boolArg(value) { return value === true || clean(value).toLowerCase() === 'true'; }
function parseRatio(value, defaultValue) {
  if (!clean(value)) return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) fail('--full-threshold must be a number between 0 and 1.');
  return parsed;
}
function parsePositiveInteger(value, defaultValue) {
  if (!clean(value)) return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) fail('--max-incremental-actions must be a positive integer.');
  return parsed;
}
function asArray(value) { return Array.isArray(value) ? value : []; }
function asObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function fail(message) { process.stderr.write(`${message}\n`); process.exit(1); }
