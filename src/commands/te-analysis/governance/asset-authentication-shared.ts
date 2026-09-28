import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { mkdir, open, rm } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { CliValidationError } from '../../../core/errors.js';
import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  compactInput,
  optionalJson,
  optionalNumber,
  optionalString,
  projectInput,
} from '../capability-shared.js';
import {
  assertRegularFileOrMissing,
  publishCatalogPair,
  validateQueriesFlag,
} from '../catalog-list.js';

const ASSET_TYPES = new Set([
  'event', 'event_prop', 'user_prop', 'user_tag',
  'user_cluster', 'metric', 'report', 'dashboard',
]);
const OUTPUT_FIELDS = new Set([
  'resource_type', 'resource_key', 'display_name', 'description',
  'owner_open_id', 'owner_name', 'authentication_status',
  'heat_count90d', 'user_count90d', 'impact_degree',
]);

export const assetTypesFlag: Flag = {
  name: 'asset-types', type: 'json', required: false,
  desc: 'Optional JSON array of asset types. Omit for every supported type.',
};
export const authenticationStatusFilterFlag: Flag = {
  name: 'authentication-status', type: 'number', required: false,
  desc: 'Authentication status: 1 for authenticated or 0 for unauthenticated.', min: 0, max: 1,
};
export const governanceQueriesFlag: Flag = {
  name: 'queries', type: 'json', required: false,
  desc: 'Optional JSON array of 1 to 20 keywords matched against identity and display fields.',
};
export const heatCountGtFlag: Flag = {
  name: 'heat-count-gt', type: 'number', required: false,
  desc: 'Strict recent-90-day heat threshold.', min: 0,
};
export const userCountGtFlag: Flag = {
  name: 'user-count-gt', type: 'number', required: false,
  desc: 'Strict recent-90-day user threshold.', min: 0,
};
export const impactDegreeGtFlag: Flag = {
  name: 'impact-degree-gt', type: 'number', required: false,
  desc: 'Strict governance impact threshold.', min: 0,
};
export const matchFlag: Flag = {
  name: 'match', type: 'string', required: false,
  desc: 'Combine multiple numeric thresholds with any or all. Default: all.', default: 'all',
};
export const authenticationFieldsFlag: Flag = {
  name: 'fields', type: 'json', required: false,
  desc: 'Optional JSON array of output fields.',
};
export const authenticationExportOutputFlag: Flag = {
  name: 'output', type: 'string', required: true,
  desc: 'Local .jsonl output path. Integrity metadata is written to <output>.meta.json.',
};

export const authenticationFilterFlags: Flag[] = [
  assetTypesFlag,
  authenticationStatusFilterFlag,
  governanceQueriesFlag,
  heatCountGtFlag,
  userCountGtFlag,
  impactDegreeGtFlag,
  matchFlag,
  authenticationFieldsFlag,
];

export function validateAuthenticationFilters(ctx: RuntimeContext): void {
  validateQueriesFlag(ctx);
  validateStringArray(ctx, 'asset-types', ASSET_TYPES);
  validateStringArray(ctx, 'fields', OUTPUT_FIELDS);
  const match = optionalString(ctx, 'match');
  if (match !== undefined && match !== 'any' && match !== 'all') {
    throw new CliValidationError('--match must be any or all');
  }
}

export function authenticationFilterInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    asset_types: optionalJson(ctx, 'asset-types'),
    authentication_status: optionalNumber(ctx, 'authentication-status'),
    queries: optionalJson(ctx, 'queries'),
    heat_count_gt: optionalNumber(ctx, 'heat-count-gt'),
    user_count_gt: optionalNumber(ctx, 'user-count-gt'),
    impact_degree_gt: optionalNumber(ctx, 'impact-degree-gt'),
    match: optionalString(ctx, 'match'),
    fields: optionalJson(ctx, 'fields'),
  });
}

export function validateAuthenticationExport(ctx: RuntimeContext): void {
  validateAuthenticationFilters(ctx);
  if (extname(ctx.str('output').trim()).toLowerCase() !== '.jsonl') {
    throw new CliValidationError('--output must use the .jsonl extension');
  }
}

export function authenticationExportPostProcess() {
  return async (result: unknown, input: Record<string, unknown>, ctx: RuntimeContext): Promise<unknown> => {
    if (typeof result !== 'object' || result === null) {
      throw new Error('Asset-authentication export returned an invalid response');
    }
    const data = result as Record<string, unknown>;
    const rows = data.assets;
    if (!Array.isArray(rows) || data.complete !== true
      || typeof data.total !== 'number' || data.total !== rows.length
      || typeof data.snapshot_hash !== 'string' || typeof data.stat_as_of !== 'string') {
      throw new Error('Asset-authentication export failed completeness or snapshot validation');
    }

    const outputPath = resolve(ctx.str('output').trim());
    const metaPath = `${outputPath}.meta.json`;
    await mkdir(dirname(outputPath), { recursive: true });
    await assertRegularFileOrMissing(outputPath);
    await assertRegularFileOrMissing(metaPath);
    const suffix = `${process.pid}.${randomBytes(8).toString('hex')}`;
    const partPath = `${outputPath}.part.${suffix}`;
    const metaPartPath = `${metaPath}.part.${suffix}`;
    const hash = createHash('sha256');
    let bytes = 0;
    let handle: FileHandle | undefined;
    try {
      handle = await open(partPath, 'w', 0o600);
      for (const row of rows) {
        const line = `${JSON.stringify(row)}\n`;
        const buffer = Buffer.from(line, 'utf8');
        hash.update(buffer);
        bytes += buffer.length;
        await handle.write(buffer);
      }
      await handle.sync();
      await handle.close();
      handle = undefined;
      const checksum = hash.digest('hex');
      const metadata = {
        complete: true,
        project_id: input.project_id,
        total: rows.length,
        stat_as_of: data.stat_as_of,
        snapshot_hash: data.snapshot_hash,
        checksum,
      };
      handle = await open(metaPartPath, 'w', 0o600);
      await handle.write(`${JSON.stringify(metadata)}\n`, undefined, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await publishCatalogPair(partPath, outputPath, metaPartPath, metaPath, suffix);
      return {
        output_path: outputPath,
        metadata_path: metaPath,
        format: 'jsonl',
        row_count: rows.length,
        bytes,
        checksum,
        snapshot_hash: data.snapshot_hash,
        complete: true,
      };
    } catch (error) {
      await handle?.close().catch(() => undefined);
      await rm(partPath, { force: true }).catch(() => undefined);
      await rm(metaPartPath, { force: true }).catch(() => undefined);
      throw error;
    }
  };
}

export function assetRefsInput(ctx: RuntimeContext): Array<{ resource_type: string; resource_key: string }> {
  const inline = optionalJson(ctx, 'asset-refs');
  const file = optionalString(ctx, 'asset-file');
  const assetType = optionalString(ctx, 'asset-type');
  const assetIds = optionalJson(ctx, 'asset-ids');
  const sources = Number(inline !== undefined) + Number(file !== undefined)
    + Number(assetType !== undefined || assetIds !== undefined);
  if (sources !== 1) {
    throw new CliValidationError('Use exactly one input: --asset-refs, --asset-file, or --asset-type with --asset-ids');
  }
  let values: unknown;
  if (inline !== undefined) {
    values = inline;
  } else if (file !== undefined) {
    const path = resolve(file);
    if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
      throw new CliValidationError(`--asset-file must be a regular file: ${path}`);
    }
    values = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new CliValidationError(`--asset-file line ${index + 1} is not valid JSON`);
      }
    });
  } else {
    if (assetType === undefined || assetIds === undefined || !Array.isArray(assetIds)) {
      throw new CliValidationError('--asset-type and --asset-ids must be provided together');
    }
    values = assetIds.map((resourceKey) => ({ resource_type: assetType, resource_key: resourceKey }));
  }
  if (!Array.isArray(values) || values.length === 0) {
    throw new CliValidationError('The selected asset reference set must not be empty');
  }
  const refs = values.map((value, index) => normalizeRef(value, index));
  return [...new Map(refs.map((ref) => [`${ref.resource_type}\u0001${ref.resource_key}`, ref])).values()];
}

function normalizeRef(value: unknown, index: number): { resource_type: string; resource_key: string } {
  if (typeof value !== 'object' || value === null) {
    throw new CliValidationError(`Asset reference ${index + 1} must be an object`);
  }
  const source = value as Record<string, unknown>;
  const resourceType = source.resource_type;
  const resourceKey = source.resource_key;
  if (typeof resourceType !== 'string' || !ASSET_TYPES.has(resourceType)
    || (typeof resourceKey !== 'string' && typeof resourceKey !== 'number')
    || String(resourceKey).trim() === '') {
    throw new CliValidationError(`Asset reference ${index + 1} requires a supported resource_type and non-empty resource_key`);
  }
  return { resource_type: resourceType, resource_key: String(resourceKey) };
}

function validateStringArray(ctx: RuntimeContext, name: string, allowed: Set<string>): void {
  const value = optionalJson(ctx, name);
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length === 0
    || value.some((item) => typeof item !== 'string' || !allowed.has(item))) {
    throw new CliValidationError(`--${name} must be a non-empty JSON array of supported values`);
  }
}
