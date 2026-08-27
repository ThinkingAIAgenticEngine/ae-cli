import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import type { Command } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { readLocalDataMapping, sourceColumns } from './mapping.js';
import type { LocalDataFormat, LocalDataMapping } from './types.js';
import { MAPPING_VERSION } from './types.js';
import { zipPackage } from './archive.js';
import {
  buildPipelineDescriptor,
  buildShapeBaseline,
  generateBinScripts,
  generateEnvTemplate,
  generateGitignore,
  generateReadme,
  generateRunbook,
  type PipelineTarget,
  type RelayFile,
} from './relay.js';

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
 * Only the raw source columns (name, reconstructed via sourceColumns so flatten,
 * exclude, and account-vs-distinct decisions don't move it), the format, and the event
 * model contribute. Everything else is business logic — `value_mapping`, transforms,
 * `time_format`, `flatten_rules`, `exclude_columns`, the fixed `default_event_name`,
 * and the system-field assignments themselves (a user-confirmed constant, not a
 * property of the table) — and is deliberately excluded: re-handing off the same table
 * with new business logic should refresh the existing entry, not fork a new one.
 */
export function structureFingerprint(mapping: LocalDataMapping): string {
  const canonical = {
    mode: mapping.mode,
    format: mapping.source.format,
    columns: sourceColumns(mapping),
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
  entry: HandoffIndexEntry;
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

  return { outDir, handoffDir, dirName, fingerprint, reusedExisting, planFile: planFileRel, entry };
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
  description: 'Export a reusable handoff package (pipeline descriptor + frozen mappings + stage executors + docs) and a shareable zip.',
  flags: [
    { name: 'mapping', type: 'string', required: true, variadic: true, sensitive: true, desc: `Confirmed ${MAPPING_VERSION} JSON, file path, or @file. Repeat for multiple data sets (one sheet each).` },
    { name: 'plan-file', type: 'string', sensitive: true, desc: 'Tracking-plan draft.json to reference inside the handoff package.' },
    { name: 'out-dir', type: 'string', sensitive: true, desc: 'Handoff root directory. Default: .ae-cli/data-integration (project workspace).' },
    { name: 'pushurl', type: 'string', sensitive: true, desc: 'Receiver base URL to record as the reuse upload target (sink endpoint = pushurl + /sync_json). Reuse still requires --confirm.' },
    { name: 'project-id', type: 'string', sensitive: true, desc: 'Numeric destination project ID to record; upload derives the APPID from it via project info get.' },
  ],
  risk: 'write',
  dryRun: async (ctx) => {
    const mappings = ctx.list('mapping').map((source) => readLocalDataMapping(source));
    const outDir = resolve(ctx.str('out-dir').trim() || join('.ae-cli', 'data-integration'));
    const planFile = ctx.str('plan-file').trim() || undefined;
    const pushurl = ctx.str('pushurl').trim() || undefined;
    const projectId = ctx.str('project-id').trim() || undefined;
    const fingerprints = mappings.map(structureFingerprint);
    return {
      action: 'handoff_local_data',
      out_dir: outDir,
      mapping_count: mappings.length,
      fingerprints,
      target: { pushurl, project_id: projectId },
      files: handoffFileList(fingerprints, planFile),
      index_file: join(outDir, 'index.json'),
      pipeline_file: join(outDir, 'pipeline.json'),
      shape_file: join(outDir, 'shape.json'),
      zip_path: zipPathFor(outDir, fingerprints[0]),
    };
  },
  execute: async (ctx) => {
    const mappings = ctx.list('mapping').map((source) => readLocalDataMapping(source));
    const outDir = resolve(ctx.str('out-dir').trim() || join('.ae-cli', 'data-integration'));
    const planFile = ctx.str('plan-file').trim() || undefined;
    const target: PipelineTarget = {
      pushurl: ctx.str('pushurl').trim() || undefined,
      project_id: ctx.str('project-id').trim() || undefined,
    };

    const items = mappings.map((mapping) => ({
      mapping,
      build: buildHandoffPackage(outDir, mapping, planFile),
    }));
    const entries = items.map((item) => item.build.entry);

    const relayFiles: RelayFile[] = [
      { relPath: 'pipeline.json', content: `${JSON.stringify(buildPipelineDescriptor(entries, target), null, 2)}\n`, mode: 0o600 },
      { relPath: 'shape.json', content: `${JSON.stringify(buildShapeBaseline(items.map((item) => ({ mapping: item.mapping, fingerprint: item.build.fingerprint }))), null, 2)}\n`, mode: 0o600 },
      ...generateBinScripts(),
      { relPath: 'README.md', content: generateReadme(), mode: 0o600 },
      { relPath: 'RUNBOOK.md', content: generateRunbook(), mode: 0o600 },
      { relPath: '.local/target.env.example', content: generateEnvTemplate(), mode: 0o600 },
      { relPath: '.gitignore', content: generateGitignore(), mode: 0o600 },
      { relPath: 'inbox/.gitkeep', content: '', mode: 0o600 },
      { relPath: 'runs/.gitkeep', content: '', mode: 0o600 },
    ];
    for (const file of relayFiles) writeRelayFile(outDir, file);

    // The zip is this round's deliverable only: the frozen mappings just written,
    // a scoped index of those entries, and the generic executors/docs. The package
    // directory keeps the accumulated history for reuse matching.
    const zipPath = zipPathFor(outDir, entries[0].fingerprint);
    const stagingDir = stageScopedPackage(outDir, items.map((item) => item.build), entries, relayFiles);
    try {
      await zipPackage(stagingDir, zipPath);
      chmodSync(zipPath, 0o600);
    } finally {
      rmSync(stagingDir, { recursive: true, force: true });
    }

    return {
      out_dir: outDir,
      zip_path: zipPath,
      pipeline_file: join(outDir, 'pipeline.json'),
      shape_file: join(outDir, 'shape.json'),
      index_file: join(outDir, 'index.json'),
      handoff_dirs: items.map((item) => item.build.dirName),
      deliverables: buildDeliverables(outDir, relayFiles, items),
      next_steps: [
        `Review the pipeline descriptor and four confirmation gates: ${join(outDir, 'RUNBOOK.md')}.`,
        `Share the archive: ${zipPath}.`,
        `Next same-shape file: cd ${outDir} && bin/run.sh <new-file>, then bin/upload.sh runs/<run-id> --confirm.`,
      ],
      reused_existing: items.some((item) => item.build.reusedExisting),
    };
  },
};

function zipPathFor(outDir: string, fingerprint: string | undefined): string | undefined {
  if (!fingerprint) return undefined;
  return join(dirname(resolve(outDir)), `ae-data-integration-handoff-${fingerprint.slice(0, 8)}.zip`);
}

const RELAY_FILE_PATHS = [
  'pipeline.json',
  'shape.json',
  'index.json',
  'README.md',
  'RUNBOOK.md',
  '.local/target.env.example',
  '.gitignore',
  'bin/run.sh',
  'bin/upload.sh',
  'bin/bind_mapping.py',
  'bin/summarize.py',
  'bin/plan_check.py',
  'bin/verify.py',
  'bin/resolve_appid.py',
  'inbox/.gitkeep',
  'runs/.gitkeep',
];

/** Files written under each fingerprint directory: the frozen mapping, its wrapper, and an optional plan reference. */
function mappingDirFiles(dirName: string, planFile: string | undefined): string[] {
  return [
    `${dirName}/mapping.json`,
    `${dirName}/transform.mjs`,
    ...(planFile ? [`${dirName}/plan.json`] : []),
  ];
}

/** Every file the handoff writes, for dry-run preview: relay files then one directory per mapping. */
function handoffFileList(fingerprints: string[], planFile: string | undefined): string[] {
  const perMapping = fingerprints.flatMap((fingerprint) =>
    mappingDirFiles(fingerprint.slice(0, HANDOFF_DIR_LEN), planFile),
  );
  return [...RELAY_FILE_PATHS, ...perMapping];
}

interface HandoffDeliverable {
  rel_path: string;
  abs_path: string;
}

/** The full set of files written, so `deliverables` matches what actually lands on disk. */
function buildDeliverables(outDir: string, relayFiles: RelayFile[], items: Array<{ build: HandoffBuild }>): HandoffDeliverable[] {
  const relay = [
    { rel_path: 'index.json', abs_path: join(outDir, 'index.json') },
    ...relayFiles.map((file) => ({ rel_path: file.relPath, abs_path: join(outDir, file.relPath) })),
  ];
  const mappings = items.flatMap((item) =>
    mappingDirFiles(item.build.dirName, item.build.planFile).map((rel) => ({
      rel_path: rel,
      abs_path: join(outDir, rel),
    })),
  );
  return [...relay, ...mappings];
}

function writeRelayFile(outDir: string, file: RelayFile): void {
  const abs = join(outDir, file.relPath);
  mkdirSync(dirname(abs), { recursive: true, mode: 0o700 });
  writeFileSync(abs, file.content, { encoding: 'utf8', mode: file.mode });
  chmodSync(abs, file.mode);
}

/**
 * Stage the per-round package that gets zipped: this round's frozen mappings,
 * a scoped index of just those entries, and the generic relay files. The package
 * directory itself keeps every historical round for reuse matching, so the
 * archive is a single-round deliverable, not a snapshot of the whole directory.
 */
export function stageScopedPackage(
  outDir: string,
  mappingDirs: Array<{ dirName: string; planFile?: string }>,
  entries: HandoffIndexEntry[],
  relayFiles: RelayFile[],
): string {
  const staging = mkdtempSync(join(tmpdir(), 'ae-handoff-'));
  writeSecureJson(join(staging, 'index.json'), { version: HANDOFF_INDEX_VERSION, entries });
  for (const file of relayFiles) writeRelayFile(staging, file);
  for (const { dirName, planFile } of mappingDirs) {
    for (const rel of mappingDirFiles(dirName, planFile)) {
      const dest = join(staging, rel);
      mkdirSync(dirname(dest), { recursive: true, mode: 0o700 });
      writeFileSync(dest, readFileSync(join(outDir, rel), 'utf8'), { encoding: 'utf8', mode: 0o600 });
      chmodSync(dest, 0o600);
    }
  }
  return staging;
}
