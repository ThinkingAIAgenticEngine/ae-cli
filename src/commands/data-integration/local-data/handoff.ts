import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { readLocalDataMapping } from './mapping.js';
import type { LocalDataFormat, LocalDataMapping } from './types.js';

/** Handoff index file version — a shared fingerprint index for reuse detection. */
export const HANDOFF_INDEX_VERSION = 'ae-data-integration-index/v1';
const HANDOFF_DIR_LEN = 16;

export interface HandoffIndexEntry {
  fingerprint: string;
  created_at: string;
  source_sha256: string;
  format: LocalDataFormat;
  data_set: string;
  mode: LocalDataMapping['mode'];
  property_count: number;
  /** Path relative to the index file, e.g. "abcd1234/mapping.json". */
  mapping_file: string;
  /** Path relative to the index file when a tracking-plan draft was packaged. */
  plan_file?: string;
}

export interface HandoffIndex {
  version: typeof HANDOFF_INDEX_VERSION;
  entries: HandoffIndexEntry[];
}

/**
 * Structural fingerprint of a mapping: the table shape that reuse matching keys on.
 *
 * Only the columns (name + type), event model, identity fields, and excluded
 * columns contribute. Business logic — `value_mapping`, transforms, `time_format`,
 * and the fixed `default_event_name` (a user-confirmed constant, not a property of
 * the table) — is deliberately excluded: re-handing off the same table with new
 * business logic should refresh the existing entry, not fork a new one. The
 * `event_name_field` (the column that carries event names) stays structural.
 */
export function structureFingerprint(mapping: LocalDataMapping): string {
  const canonical = {
    mode: mapping.mode,
    time_field: mapping.time.field,
    account_id_field: mapping.account_id_field ?? null,
    distinct_id_field: mapping.distinct_id_field ?? null,
    record_type_field: mapping.record_type_field ?? null,
    event_name_field: mapping.event_name_field ?? null,
    columns: mapping.properties
      .map((property) => ({ source: property.source, type: property.type }))
      .sort((left, right) => left.source.localeCompare(right.source)),
    excluded: [...(mapping.exclude_columns ?? [])].sort(),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** Replace the entry with the same fingerprint, or append when it is new. */
export function upsertIndexEntry(index: HandoffIndex, entry: HandoffIndexEntry): HandoffIndex {
  const entries = index.entries.filter((item) => item.fingerprint !== entry.fingerprint);
  return { version: index.version, entries: [...entries, entry] };
}

interface HandoffBuild {
  outDir: string;
  handoffDir: string;
  dirName: string;
  fingerprint: string;
  reusedExisting: boolean;
  planFile?: string;
}

function buildHandoffPackage(outDir: string, mapping: LocalDataMapping, planFile: string | undefined): HandoffBuild {
  const fingerprint = structureFingerprint(mapping);
  const dirName = fingerprint.slice(0, HANDOFF_DIR_LEN);
  const handoffDir = join(outDir, dirName);
  const indexPath = join(outDir, 'index.json');

  // Fail fast on a malformed index before writing anything.
  const index = readHandoffIndex(indexPath);
  const reusedExisting = index.entries.some((item) => item.fingerprint === fingerprint);

  mkdirSync(handoffDir, { recursive: true, mode: 0o700 });
  chmodSync(handoffDir, 0o700);
  writeSecureJson(join(handoffDir, 'mapping.json'), mapping);
  writeSecureText(join(handoffDir, 'transform.mjs'), createHandoffScript());

  let planFileRel: string | undefined;
  if (planFile) {
    writeSecureJson(join(handoffDir, 'plan.json'), readPlanFile(planFile));
    planFileRel = `${dirName}/plan.json`;
  }

  const entry: HandoffIndexEntry = {
    fingerprint,
    created_at: new Date().toISOString(),
    source_sha256: mapping.source.sha256,
    format: mapping.source.format,
    data_set: mapping.source.data_set,
    mode: mapping.mode,
    property_count: mapping.properties.length,
    mapping_file: `${dirName}/mapping.json`,
    ...(planFileRel ? { plan_file: planFileRel } : {}),
  };
  writeAtomicJson(indexPath, upsertIndexEntry(index, entry));

  return { outDir, handoffDir, dirName, fingerprint, reusedExisting, planFile: planFileRel };
}

export function readHandoffIndex(path: string): HandoffIndex {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return { version: HANDOFF_INDEX_VERSION, entries: [] };
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new CliValidationError('The handoff index is not valid JSON.', {
      code: 'LOCAL_DATA_HANDOFF_INDEX_INVALID',
      location: { field: 'out-dir' },
    });
  }
  if (!isRecord(value) || value.version !== HANDOFF_INDEX_VERSION || !Array.isArray(value.entries)) {
    throw new CliValidationError('The handoff index is not ae-data-integration-index/v1.', {
      code: 'LOCAL_DATA_HANDOFF_INDEX_INVALID',
      location: { field: 'out-dir' },
    });
  }
  return value as unknown as HandoffIndex;
}

function readPlanFile(path: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new CliValidationError('The tracking-plan file could not be read.', {
      code: 'LOCAL_DATA_HANDOFF_PLAN_NOT_FOUND',
      location: { field: 'plan-file' },
    });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new CliValidationError('The tracking-plan file is not valid JSON.', {
      code: 'LOCAL_DATA_HANDOFF_PLAN_INVALID',
      location: { field: 'plan-file' },
    });
  }
}

/**
 * Reusable transform wrapper: convert a new same-shape file through the frozen mapping.
 *
 * The frozen mapping pins the original file's content fingerprint, so the wrapper
 * re-stamps `source.sha256` with the new file's fingerprint before invoking convert.
 * The transform logic (properties, value_mapping, flatten_rules, ...) is reused unchanged;
 * the content guard still binds this run to the specific file it is fed.
 */
export function createHandoffScript(): string {
  return [
    "import { createHash } from 'node:crypto';",
    "import { createReadStream, readFileSync } from 'node:fs';",
    "import { spawnSync } from 'node:child_process';",
    "import { fileURLToPath } from 'node:url';",
    "import { dirname, join } from 'node:path';",
    '',
    'const [inputFile, outputDir] = process.argv.slice(2);',
    "if (!inputFile) { console.error('Usage: node transform.mjs <new-input-file> [<output-dir>]'); process.exit(2); }",
    '',
    'async function sha256Of(file) {',
    "  const hash = createHash('sha256');",
    "  for await (const chunk of createReadStream(file)) hash.update(chunk);",
    "  return hash.digest('hex');",
    '}',
    '',
    "const here = dirname(fileURLToPath(import.meta.url));",
    "const mapping = JSON.parse(readFileSync(join(here, 'mapping.json'), 'utf8'));",
    '// Re-stamp the content fingerprint for this specific file; the transform logic is reused unchanged.',
    'mapping.source.sha256 = await sha256Of(inputFile);',
    '',
    "const args = ['data-integration', 'convert', '--input-file', inputFile, '--mapping', JSON.stringify(mapping)];",
    "if (outputDir) args.push('--output-dir', outputDir);",
    "const result = spawnSync('ae-cli', args, { stdio: 'inherit' });",
    'process.exit(result.status ?? 1);',
    '',
  ].join('\n');
}

function writeSecureJson(path: string, value: unknown): void {
  writeSecureText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeSecureText(path: string, content: string): void {
  writeFileSync(path, content, { encoding: 'utf8', mode: 0o600 });
  chmodSync(path, 0o600);
}

function writeAtomicJson(path: string, value: unknown): void {
  writeSecureText(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
  chmodSync(path, 0o600);
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export const dataIntegrationHandoff: Command = {
  service: 'data-integration',
  command: 'handoff',
  usesAeHost: false,
  description: 'Export a reusable handoff package (frozen mapping + transform script + plan reference) under .ae-data-integration/.',
  flags: [
    { name: 'mapping', type: 'string', required: true, sensitive: true, desc: 'Confirmed ae-local-data-mapping/v1 JSON, file path, or @file.' },
    { name: 'plan-file', type: 'string', sensitive: true, desc: 'Tracking-plan draft.json to reference inside the handoff package.' },
    { name: 'out-dir', type: 'string', sensitive: true, desc: 'Handoff root directory. Default: .ae-data-integration.' },
  ],
  risk: 'write',
  dryRun: async (ctx) => {
    const mapping = readLocalDataMapping(ctx.str('mapping'));
    const outDir = resolve(ctx.str('out-dir').trim() || '.ae-data-integration');
    const planFile = ctx.str('plan-file').trim() || undefined;
    return {
      action: 'handoff_local_data',
      out_dir: outDir,
      fingerprint: structureFingerprint(mapping),
      source_sha256: mapping.source.sha256,
      mode: mapping.mode,
      property_count: mapping.properties.length,
      files: ['mapping.json', 'transform.mjs', ...(planFile ? ['plan.json'] : [])],
      index_file: join(outDir, 'index.json'),
    };
  },
  execute: async (ctx) => {
    const mapping = readLocalDataMapping(ctx.str('mapping'));
    const outDir = resolve(ctx.str('out-dir').trim() || '.ae-data-integration');
    const planFile = ctx.str('plan-file').trim() || undefined;
    const build = buildHandoffPackage(outDir, mapping, planFile);
    return {
      out_dir: build.outDir,
      handoff_dir: build.handoffDir,
      fingerprint: build.fingerprint,
      mapping_file: `${build.dirName}/mapping.json`,
      ...(build.planFile ? { plan_file: build.planFile } : {}),
      run: `node ${join(build.handoffDir, 'transform.mjs')} <new-input-file> [<output-dir>]`,
      index_file: join(outDir, 'index.json'),
      reused_existing: build.reusedExisting,
    };
  },
};
