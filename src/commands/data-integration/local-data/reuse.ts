import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Command } from '../../../framework/types.js';
import { readLocalDataMapping } from './mapping.js';
import { readHandoffIndex, structureFingerprint } from './handoff.js';
import type { LocalDataFormat, LocalDataMapping } from './types.js';

/** A reusable package matched by structure fingerprint. */
export interface ReuseMatch {
  fingerprint: string;
  created_at: string;
  format: LocalDataFormat;
  data_set: string;
  mode: LocalDataMapping['mode'];
  property_count: number;
  /** Path relative to the index file, e.g. "abcd1234/mapping.json". */
  mapping_file: string;
  /** Path relative to the index file when a tracking-plan draft was packaged. */
  plan_file?: string;
  /** Frozen event name from the packaged mapping (single-event track), when readable. */
  default_event_name?: string;
  /** Exact command to convert a new same-shape file through the frozen mapping. */
  run: string;
}

export interface ReuseResult {
  matched: boolean;
  fingerprint: string;
  index_file: string;
  match?: ReuseMatch;
}

/**
 * Match a candidate mapping (typically inspect's `recommended_mapping`) against the
 * handoff index. A hit means the frozen transform can be reused for a same-shape file:
 * the user confirms, then runs the returned command instead of the full pipeline.
 */
export function detectReuse(mapping: LocalDataMapping, outDir: string): ReuseResult {
  const fingerprint = structureFingerprint(mapping);
  const indexPath = join(outDir, 'index.json');
  const index = readHandoffIndex(indexPath);
  const entry = index.entries.find((item) => item.fingerprint === fingerprint);
  if (!entry) return { matched: false, fingerprint, index_file: indexPath };

  const mappingPath = join(outDir, entry.mapping_file);
  const match: ReuseMatch = {
    fingerprint: entry.fingerprint,
    created_at: entry.created_at,
    format: entry.format,
    data_set: entry.data_set,
    mode: entry.mode,
    property_count: entry.property_count,
    mapping_file: entry.mapping_file,
    ...(entry.plan_file ? { plan_file: entry.plan_file } : {}),
    ...readFrozenEventName(mappingPath),
    run: `node ${join(outDir, dirname(entry.mapping_file), 'transform.mjs')} <new-input-file> [<output-dir>]`,
  };
  return { matched: true, fingerprint, index_file: indexPath, match };
}

/** Best-effort read of the packaged mapping's frozen event name. */
function readFrozenEventName(path: string): { default_event_name?: string } {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
  if (isRecord(value) && typeof value.default_event_name === 'string' && value.default_event_name) {
    return { default_event_name: value.default_event_name };
  }
  return {};
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export const dataIntegrationReuse: Command = {
  service: 'data-integration',
  command: 'reuse',
  usesAeHost: false,
  description: 'Match a candidate mapping against the .ae-data-integration/ handoff index and propose a reusable package.',
  flags: [
    { name: 'mapping', type: 'string', required: true, sensitive: true, desc: 'Candidate ae-local-data-mapping/v1 JSON, file path, or @file (typically inspect recommended_mapping).' },
    { name: 'out-dir', type: 'string', sensitive: true, desc: 'Handoff root directory. Default: .ae-data-integration.' },
  ],
  risk: 'read',
  dryRun: async (ctx) => {
    const mapping = readLocalDataMapping(ctx.str('mapping'));
    const outDir = resolve(ctx.str('out-dir').trim() || '.ae-data-integration');
    const result = detectReuse(mapping, outDir);
    return {
      action: 'reuse_detect',
      fingerprint: result.fingerprint,
      matched: result.matched,
      index_file: result.index_file,
    };
  },
  execute: async (ctx) => {
    const mapping = readLocalDataMapping(ctx.str('mapping'));
    const outDir = resolve(ctx.str('out-dir').trim() || '.ae-data-integration');
    return detectReuse(mapping, outDir);
  },
};
