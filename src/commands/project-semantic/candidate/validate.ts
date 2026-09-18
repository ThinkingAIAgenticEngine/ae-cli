import type { Command } from '../../../framework/types.js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { arrayValue, readJsonFile } from '../shared.js';

type JsonRecord = Record<string, unknown>;
type LoadedAssetPackage = {
  assets: JsonRecord[];
  catalogEntries: JsonRecord[];
  snapshotHash?: string;
};

const SEMANTIC_TYPES = new Set([
  'business_concept',
  'business_rule',
  'asset_semantics',
  'calculation_convention',
]);

export const projectSemanticCandidateValidate: Command = {
  service: 'project-semantic',
  resource: 'candidate',
  command: 'validate',
  description: 'Validate deterministic candidate contracts against a certified project-semantic asset package.',
  flags: [
    { name: 'asset-package', type: 'string', required: true, desc: 'Materialized authenticated project asset package directory.' },
    { name: 'submit-file', type: 'string', required: true, desc: 'Agent-authored JSON containing topic_groups.' },
  ],
  risk: 'read',
  execute: async (ctx) => validateCandidateFile(
    loadStructuredPackage(ctx.str('asset-package')),
    readJsonFile(ctx.str('submit-file'), 4 * 1024 * 1024),
  ),
};

function validateCandidateFile(assetPackage: LoadedAssetPackage, submitFile: unknown) {
  const submitRecord = recordValue(submitFile, 'submit file');
  const assets = assetPackage.assets;
  const groups = arrayValue(submitRecord.topic_groups, 'submit file topic_groups').map((item) => recordValue(item, 'topic group'));
  const assetKeys = new Set(assets.flatMap(assetIdentityKeys));
  const assetByIdentityKey = new Map<string, JsonRecord>();
  assets.forEach((asset) => {
    assetIdentityKeys(asset).forEach((key) => assetByIdentityKey.set(key, asset));
  });
  const candidates = groups.flatMap((group) =>
    arrayValue(group.candidates, 'topic group candidates').map((item) => ({
      group,
      candidate: recordValue(item, 'candidate'),
    })),
  );
  const errors: string[] = [];
  const warnings: string[] = [];
  const titles = new Map<string, number>();
  const bodies = new Map<string, number>();
  const blockingCatalog = assetPackage.catalogEntries.filter((entry) => entry.catalog_kind !== 'rejected');
  const rejectedCatalog = assetPackage.catalogEntries.filter((entry) => entry.catalog_kind === 'rejected');
  let unresolvedResourceRefCount = 0;

  if (groups.length < 1 || groups.length > 100) {
    errors.push('topic_groups must contain 1 to 100 groups.');
  }
  if (candidates.length < 1 || candidates.length > 200) {
    errors.push('The candidate batch must contain 1 to 200 candidates.');
  }

  groups.forEach((group, groupIndex) => {
    const groupLabel = `topic_groups[${groupIndex}]`;
    requireText(group, 'topic_domain_key', groupLabel, errors);
    requireText(group, 'topic_domain_title', groupLabel, errors);
    requireText(group, 'topic_group_key', groupLabel, errors);
    requireText(group, 'topic_group_title', groupLabel, errors);
    requireText(group, 'topic_group_reason', groupLabel, errors);
  });

  candidates.forEach(({ candidate }, index) => {
    const label = `candidate[${index}]`;
    const semanticType = requireText(candidate, 'semantic_type', label, errors).toLowerCase();
    const title = requireText(candidate, 'title', label, errors);
    requireText(candidate, 'summary', label, errors);
    const content = requireText(candidate, 'content', label, errors);
    requireText(candidate, 'recommendation_reason', label, errors);
    if (!SEMANTIC_TYPES.has(semanticType)) {
      errors.push(`${label}.semantic_type is unsupported.`);
    }
    increment(titles, normalize(title));
    increment(bodies, normalize(content));
    const semanticTypeAndBody = semanticContentFingerprint(semanticType, content);
    const duplicateEntry = blockingCatalog.find((entry) =>
      normalize(textValue(entry.title)) === normalize(title)
      || textValue(entry.content_fingerprint) === semanticTypeAndBody);
    if (duplicateEntry) {
      errors.push(`${label} duplicates an existing ${catalogLabel(duplicateEntry)} semantic: ${textValue(duplicateEntry.title)}.`);
    }
    const rejectedEntry = rejectedCatalog.find((entry) =>
      normalize(textValue(entry.title)) === normalize(title)
      || textValue(entry.content_fingerprint) === semanticTypeAndBody);
    if (rejectedEntry && !hasMaterialChange(candidate)) {
      warnings.push(`${label} matches rejected candidate ${textValue(rejectedEntry.candidate_id)}; provide change_kind and target_candidate_id for a material revision.`);
    }

    const refs = arrayValue(candidate.resource_refs, `${label}.resource_refs`).map((item) => recordValue(item, 'resource ref'));
    if (refs.length === 0) {
      errors.push(`${label}.resource_refs must bind certified evidence from the asset package.`);
    }
    refs.forEach((ref) => {
      if (!resourceIdentityKeys(ref).some((key) => assetKeys.has(key))) {
        unresolvedResourceRefCount += 1;
      }
    });
  });

  const duplicateTitles = duplicateCount(titles);
  const duplicateBodies = duplicateCount(bodies);
  if (duplicateTitles > 0) {
    errors.push(`${duplicateTitles} duplicate candidate titles were generated.`);
  }
  if (duplicateBodies > 0) {
    errors.push(`${duplicateBodies} duplicate semantic bodies were generated.`);
  }
  if (unresolvedResourceRefCount > 0) {
    errors.push(`${unresolvedResourceRefCount} resource_refs do not resolve to the authenticated asset package.`);
  }
  const oneCandidatePerAsset = candidates.length > 1 && candidates.every(({ candidate }) =>
    Array.isArray(candidate.resource_refs) && candidate.resource_refs.length === 1,
  );

  return {
    passed: errors.length === 0 && warnings.length === 0,
    topic_domain_count: groups.length,
    candidate_count: candidates.length,
    authenticated_asset_count: assets.length,
    unresolved_resource_ref_count: unresolvedResourceRefCount,
    duplicate_title_count: duplicateTitles,
    duplicate_body_count: duplicateBodies,
    one_candidate_per_asset: oneCandidatePerAsset,
    catalog_entry_count: assetPackage.catalogEntries.length,
    package_kind: 'structured_directory',
    snapshot_hash: assetPackage.snapshotHash,
    topic_groups: topicGroupSummaries(groups, assetByIdentityKey),
    errors,
    warnings,
  };
}

function topicGroupSummaries(groups: JsonRecord[], assetByIdentityKey: Map<string, JsonRecord>) {
  return groups.map((group) => {
    const candidates = arrayValue(group.candidates, 'topic group candidates').map((item) => recordValue(item, 'candidate'));
    return {
      topic_domain_key: textValue(group.topic_domain_key),
      topic_domain_title: textValue(group.topic_domain_title),
      topic_group_key: textValue(group.topic_group_key),
      topic_group_title: textValue(group.topic_group_title),
      candidate_count: candidates.length,
      topic_group_reason: textValue(group.topic_group_reason),
      candidates: candidates.map((candidate, index) => candidateSummary(candidate, index, assetByIdentityKey)),
    };
  });
}

function candidateSummary(candidate: JsonRecord, index: number, assetByIdentityKey: Map<string, JsonRecord>) {
  const refs = Array.isArray(candidate.resource_refs)
    ? candidate.resource_refs.map((item) => recordValue(item, 'resource ref'))
    : [];
  return {
    index: index + 1,
    semantic_type: textValue(candidate.semantic_type).toLowerCase(),
    title: textValue(candidate.title),
    summary: textValue(candidate.summary),
    resource_ref_count: refs.length,
    evidence_assets: refs.map((ref) => resourceRefSummary(ref, assetByIdentityKey)),
  };
}

function resourceRefSummary(ref: JsonRecord, assetByIdentityKey: Map<string, JsonRecord>) {
  const matchedAsset = resourceIdentityKeys(ref)
    .map((key) => assetByIdentityKey.get(key))
    .find(Boolean);
  return {
    resource_type: textValue(ref.asset_type || ref.resource_type || ref.type).toLowerCase(),
    resource_key: textValue(ref.resource_key || ref.asset_id || ref.id || ref.evidence_id || ref.name),
    title: textValue(ref.title || ref.display_name || matchedAsset?.title || matchedAsset?.display_name || matchedAsset?.name),
  };
}

function loadStructuredPackage(path: string): LoadedAssetPackage {
  const packagePath = resolve(path);
  const stats = statSync(packagePath);
  if (!stats.isDirectory()) {
    throw new Error('asset-package must be a materialized structured package directory.');
  }
  recordValue(readJsonFile(join(packagePath, 'manifest.json'), 4 * 1024 * 1024), 'asset package manifest');
  const descriptor = recordValue(readJsonFile(join(packagePath, '.asset-package.json'), 64 * 1024), 'asset package descriptor');
  const snapshotHash = textValue(descriptor.snapshot_hash);
  if (!snapshotHash) {
    throw new Error('asset package descriptor must contain snapshot_hash.');
  }
  const assets = readJsonlFile(join(packagePath, 'indexes', 'asset-directory.jsonl'), 'asset directory')
    .filter((row) => row.record_type !== 'header');
  if (assets.length === 0) {
    throw new Error('asset directory must contain at least one asset.');
  }
  return {
    assets,
    catalogEntries: loadCatalogEntries(packagePath),
    snapshotHash,
  };
}

function loadCatalogEntries(packagePath: string): JsonRecord[] {
  return [
    ['published', join(packagePath, 'catalog', 'published.jsonl')],
    ['disabled', join(packagePath, 'catalog', 'disabled.jsonl')],
    ['active', join(packagePath, 'catalog', 'active-candidates.jsonl')],
    ['rejected', join(packagePath, 'catalog', 'rejected-candidates.jsonl')],
  ].flatMap(([kind, file]) => {
    if (!existsSync(file)) {
      return [];
    }
    return readJsonlFile(file, `${kind} semantic catalog`)
      .filter((row) => row.record_type !== 'header')
      .map((row) => ({ ...row, catalog_kind: kind }));
  });
}

function semanticContentFingerprint(semanticType: string, content: string): string {
  const normalized = `${semanticType.trim().toLowerCase()}\n${normalizeSemanticText(content)}`;
  return createHash('sha256').update(normalized).digest('hex');
}

function normalizeSemanticText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[，。；：、,.!?！？:;]/g, '');
}

function catalogLabel(entry: JsonRecord): string {
  if (entry.catalog_kind === 'published') {
    return 'published';
  }
  return entry.catalog_kind === 'disabled' ? 'disabled' : 'active candidate';
}

function hasMaterialChange(candidate: JsonRecord): boolean {
  return textValue(candidate.change_kind) !== '' && textValue(candidate.target_candidate_id) !== '';
}

function readJsonlFile(file: string, label: string): JsonRecord[] {
  const text = readFileSync(file, 'utf8');
  const rows: JsonRecord[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) {
      continue;
    }
    rows.push(recordValue(JSON.parse(line), `${label} line ${index + 1}`));
  }
  return rows;
}

function assetIdentityKeys(asset: JsonRecord): string[] {
  const type = textValue(asset.asset_type || asset.resource_type || asset.type).toLowerCase();
  return [asset.asset_id, asset.asset_name, asset.name, asset.resource_key, asset.id]
    .concat(asset.evidence_id)
    .flatMap((value) => identityValueKeys(type, value));
}

function resourceIdentityKeys(ref: JsonRecord): string[] {
  const type = textValue(ref.asset_type || ref.resource_type || ref.type).toLowerCase();
  return [ref.asset_id, ref.asset_name, ref.name, ref.resource_key, ref.id]
    .concat(ref.evidence_id)
    .flatMap((value) => identityValueKeys(type, value));
}

function identityValueKeys(type: string, value: unknown): string[] {
  const key = textValue(value);
  if (!type || !key) {
    return [];
  }
  const variants = new Set<string>([key]);
  const typedPrefix = `${type}_`;
  if (key.startsWith(typedPrefix) && key.length > typedPrefix.length) {
    variants.add(key.slice(typedPrefix.length));
  }
  const lastColon = key.lastIndexOf(':');
  if (lastColon >= 0 && lastColon < key.length - 1) {
    variants.add(key.slice(lastColon + 1));
  }
  return Array.from(variants).map((item) => `${type}:${item}`);
}

function recordValue(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as JsonRecord;
}

function requireText(record: JsonRecord, field: string, label: string, errors: string[]): string {
  const value = textValue(record[field]);
  if (!value) {
    errors.push(`${label}.${field} is required.`);
  }
  return value;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function increment(values: Map<string, number>, key: string): void {
  if (key) {
    values.set(key, (values.get(key) || 0) + 1);
  }
}

function duplicateCount(values: Map<string, number>): number {
  return Array.from(values.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
}
