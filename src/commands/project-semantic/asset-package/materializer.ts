import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { basename, dirname, resolve } from 'node:path';
import {
  assertOutputPathAvailable,
  downloadAnalysisArtifact,
  type AsyncArtifactLifecycleOptions,
  type AsyncRunDescriptor,
} from '../../../core/analysis-async-artifact.js';
import { CapabilityGatewayError } from '../../../core/capability-api.js';

const MAX_COMPRESSED_BYTES = 64 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;
const MAX_RECORDS = 200_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const REQUIRED_FILES = [
  'manifest.json',
  'indexes/work-units.jsonl',
  'indexes/asset-directory.jsonl',
  'indexes/coverage-batches.jsonl',
  'indexes/definition-families.jsonl',
  'indexes/governance-coverage.jsonl',
  'catalog/published.jsonl',
  'catalog/active-candidates.jsonl',
  'catalog/rejected-candidates.jsonl',
];

type PackageRecord = {
  path: string;
  append?: boolean;
  content: unknown;
};

type MaterializeArgs = Parameters<NonNullable<AsyncArtifactLifecycleOptions['materialize']>>[0];

export async function preflightAssetPackageOutput(args: {
  output: string;
  force: boolean;
}): Promise<void> {
  await assertOutputPathAvailable(args.output, args.force);
}

export async function materializeProjectSemanticAssetPackage(
  args: MaterializeArgs,
): Promise<unknown> {
  const descriptor = packageDescriptor(args.finalDescriptor);
  const output = resolve(args.output);
  const parent = dirname(output);
  const nonce = `${process.pid}-${randomBytes(6).toString('hex')}`;
  const staging = resolve(parent, `.${basename(output)}.staging-${nonce}`);
  const archive = resolve(parent, `.${basename(output)}.archive-${nonce}.jsonl.gz`);
  const backup = resolve(parent, `.${basename(output)}.backup-${nonce}`);
  let movedExisting = false;
  await assertOutputPathAvailable(output, args.force, {
    run_id: args.runId,
    artifact_id: args.artifactId,
  });
  await mkdir(parent, { recursive: true });
  await mkdir(staging, { recursive: false });
  try {
    const download = await downloadAnalysisArtifact(
      args.ctx.host(),
      args.runId,
      args.artifactId,
      archive,
      { signal: args.signal, ensureReady: false },
    );
    if (download.bytes > MAX_COMPRESSED_BYTES) {
      throw packageError('Asset package archive exceeds 64 MiB.', 'ASSET_PACKAGE_ARCHIVE_TOO_LARGE');
    }
    const materialized = await materializeArchive(archive, staging, descriptor);
    if (args.force && await exists(output)) {
      await rename(output, backup);
      movedExisting = true;
    }
    await rename(staging, output);
    if (movedExisting) {
      await rm(backup, { recursive: true, force: true });
      movedExisting = false;
    }
    return {
      ...args.finalDescriptor,
      output_path: output,
      archive_bytes: download.bytes,
      record_count: materialized.recordCount,
      uncompressed_bytes: materialized.uncompressedBytes,
    };
  } catch (error) {
    if (movedExisting) {
      await rename(backup, output).catch(() => undefined);
    }
    throw error;
  } finally {
    await rm(archive, { force: true }).catch(() => undefined);
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    if (!movedExisting) {
      await rm(backup, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function materializeArchive(
  archive: string,
  staging: string,
  descriptor: PackageDescriptor,
): Promise<{ recordCount: number; uncompressedBytes: number }> {
  const compressed = await stat(archive);
  if (compressed.size > MAX_COMPRESSED_BYTES) {
    throw packageError('Asset package archive exceeds 64 MiB.', 'ASSET_PACKAGE_ARCHIVE_TOO_LARGE');
  }
  const digest = createHash('sha256');
  const lines = createInterface({
    input: createReadStream(archive).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let recordCount = 0;
  let uncompressedBytes = 0;
  let manifest: Record<string, unknown> | undefined;
  for await (const line of lines) {
    if (!line.trim()) continue;
    uncompressedBytes += Buffer.byteLength(line, 'utf8') + 1;
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      throw packageError(
        'Asset package archive exceeds 512 MiB after decompression.',
        'ASSET_PACKAGE_ARCHIVE_TOO_LARGE',
      );
    }
    recordCount += 1;
    if (recordCount > MAX_RECORDS) {
      throw packageError('Asset package has too many records.', 'ASSET_PACKAGE_RECORD_LIMIT_EXCEEDED');
    }
    digest.update(line, 'utf8');
    digest.update('\n', 'utf8');
    const record = parseRecord(line);
    const target = resolveRecordPath(staging, record.path);
    await mkdir(dirname(target), { recursive: true });
    const content = `${JSON.stringify(record.content)}\n`;
    if (record.append) {
      await appendFile(target, content, 'utf8');
    } else {
      await writeFile(target, content, { encoding: 'utf8', flag: 'wx' });
    }
    if (record.path === 'manifest.json') {
      manifest = asObject(record.content);
    }
  }
  const actualHash = digest.digest('hex');
  if (actualHash !== descriptor.snapshotHash) {
    throw packageError(
      `Asset package content hash mismatch: expected ${descriptor.snapshotHash}, received ${actualHash}.`,
      'ASSET_PACKAGE_HASH_MISMATCH',
    );
  }
  if (!manifest || !Number.isInteger(Number(manifest.project_id))) {
    throw packageError('Asset package manifest is missing project identity.', 'ASSET_PACKAGE_MANIFEST_INVALID');
  }
  if (manifest.schema_version !== '1.0') {
    throw packageError('Project semantic asset package schema 1.0 is required.', 'ASSET_PACKAGE_VERSION_MISMATCH');
  }
  for (const required of REQUIRED_FILES) {
    if (!await exists(resolve(staging, required))) {
      throw packageError(`Asset package is missing required file ${required}.`, 'ASSET_PACKAGE_MANIFEST_INVALID');
    }
  }
  await verifyDetailLocators(staging);
  await writeFile(resolve(staging, '.asset-package.json'), JSON.stringify({
    snapshot_id: descriptor.snapshotId,
    snapshot_hash: descriptor.snapshotHash,
    schema_version: '1.0',
    company_id: Number(manifest.company_id),
    project_id: Number(manifest.project_id),
    record_count: recordCount,
    asset_scope: typeof manifest.asset_scope === 'string' ? manifest.asset_scope : 'governed',
    exported_asset_count: Number(manifest.exported_asset_count ?? manifest.authenticated_asset_count),
    authenticated_asset_count: Number(manifest.authenticated_asset_count),
    unauthenticated_asset_count: Number(manifest.unauthenticated_asset_count ?? 0),
    truncated: Boolean(manifest.truncated),
    counts: manifest.counts,
    filter_policy: manifest.filter_policy,
  }, null, 2), 'utf8');
  return { recordCount, uncompressedBytes };
}

async function verifyDetailLocators(root: string): Promise<void> {
  const directory = await readFile(resolve(root, 'indexes/asset-directory.jsonl'), 'utf8');
  for (const line of directory.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row = asObject(JSON.parse(line));
    if (!row || row.record_type === 'header') continue;
    const detail = await verifyContentLocator(root, row.detail_locator, 'Detail');
    await verifyContentLocator(root, detail.raw_locator, 'Raw detail');
  }
}

async function verifyContentLocator(
  root: string,
  value: unknown,
  label: string,
): Promise<Record<string, unknown>> {
  const locator = asObject(value);
  if (!locator || typeof locator.path !== 'string'
    || typeof locator.content_hash !== 'string'
    || !SHA256_PATTERN.test(locator.content_hash)) {
    throw packageError(
      `Asset package contains an invalid ${label.toLowerCase()} locator.`,
      'ASSET_PACKAGE_MANIFEST_INVALID',
    );
  }
  const target = resolveRecordPath(root, locator.path);
  if (!await exists(target)) {
    throw packageError(`Asset package is missing ${label.toLowerCase()} file ${locator.path}.`, 'ASSET_PACKAGE_MANIFEST_INVALID');
  }
  const content = asObject(JSON.parse(await readFile(target, 'utf8')));
  if (!content) {
    throw packageError(`${label} file is not a JSON object: ${locator.path}.`, 'ASSET_PACKAGE_MANIFEST_INVALID');
  }
  const actualHash = createHash('sha256').update(JSON.stringify(content), 'utf8').digest('hex');
  if (actualHash !== locator.content_hash) {
    throw packageError(`${label} content hash mismatch for ${locator.path}.`, 'ASSET_PACKAGE_HASH_MISMATCH');
  }
  return content;
}

function parseRecord(line: string): PackageRecord {
  const value = JSON.parse(line);
  const record = asObject(value);
  if (!record || typeof record.path !== 'string') {
    throw packageError('Asset package record is missing path.', 'ASSET_PACKAGE_RECORD_INVALID');
  }
  if (!Object.prototype.hasOwnProperty.call(record, 'content')) {
    throw packageError('Asset package record is missing content.', 'ASSET_PACKAGE_RECORD_INVALID');
  }
  return {
    path: record.path,
    append: Boolean(record.append),
    content: record.content,
  };
}

function resolveRecordPath(root: string, path: string): string {
  if (path.startsWith('/') || path.includes('\0')) {
    throw packageError(`Invalid asset package path: ${path}`, 'ASSET_PACKAGE_PATH_INVALID');
  }
  const target = resolve(root, path);
  const normalizedRoot = `${resolve(root)}/`;
  if (!target.startsWith(normalizedRoot)) {
    throw packageError(`Invalid asset package path: ${path}`, 'ASSET_PACKAGE_PATH_INVALID');
  }
  return target;
}

type PackageDescriptor = {
  snapshotId?: string;
  snapshotHash: string;
};

function packageDescriptor(descriptor: AsyncRunDescriptor): PackageDescriptor {
  const snapshotHash = stringValue(descriptor.snapshot_hash, 'snapshot_hash').toLowerCase();
  if (!SHA256_PATTERN.test(snapshotHash)) {
    throw packageError('Asset package export returned invalid snapshot_hash.', 'ASSET_PACKAGE_DESCRIPTOR_INVALID');
  }
  return {
    snapshotId: typeof descriptor.snapshot_id === 'string' ? descriptor.snapshot_id : undefined,
    snapshotHash,
  };
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw packageError(`${label} must be a non-empty string.`, 'ASSET_PACKAGE_DESCRIPTOR_INVALID');
  }
  return value;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function packageError(message: string, code: string): CapabilityGatewayError {
  return new CapabilityGatewayError(message, code, 422);
}
