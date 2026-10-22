import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, link, lstat, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { getConfigDir } from '../../core/config.js';
import type { RuntimeContext } from '../../framework/types.js';
import { TeAgentApiError, isTransientResourcePackageError, requestResourcePackageApi, requestResourcePackageRaw } from './api-client.js';
import type { PackageTask } from './resource-packages.js';

export type PackageScope = 'personal' | 'company';
type UploadStatus = 'uploading' | 'merging' | 'completed' | 'failed' | 'aborted' | 'expired';
type Upload = {
  id: string; scope: PackageScope; fileName: string; totalBytes: number;
  chunkBytes: number; totalChunks: number; parts: number[]; status: UploadStatus;
};
export type PackagePreflight = {
  snapshotId: string; status: 'ready' | 'ready_with_warnings' | 'blocked';
  blockers: Array<{ code: string; message: string; referenceKey?: string;
    replacementCandidates?: Array<{ id: string }> }>;
  warnings: Array<{ code: string; message: string; referenceKey?: string }>;
  confirmations: Array<{ code: string; message: string }>;
};
type CompletedUpload = {
  uploadId: string; packageSha256: string; manifest: unknown;
  preflight: PackagePreflight; duplicateImport: unknown | null;
};
type FileIdentity = { size: number; mtimeMs: number; dev: number; ino: number };
type UploadState = FileIdentity & {
  version: 1; host: string; filePath: string; scope: PackageScope; uploadId: string;
  requestKey: string;
};
type DownloadState = { version: 1; host: string; taskId: string; etag: string; totalBytes: number };

function stateDirectory(): string {
  return path.join(getConfigDir(), 'transfers', 'resource-packages');
}

async function ensureDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
}

async function saveJson(filePath: string, data: unknown): Promise<void> {
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data)}\n`, { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, filePath);
}

async function loadJson<T>(filePath: string): Promise<T | undefined> {
  try {
    const info = await lstat(filePath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Unsafe transfer metadata: ${filePath}`);
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error(`Invalid transfer metadata: ${filePath}`);
  }
}

async function removeFile(filePath: string): Promise<void> {
  try { await unlink(filePath); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.size === right.size && left.mtimeMs === right.mtimeMs &&
    left.dev === right.dev && left.ino === right.ino;
}

function statePath(directory: string, host: string, filePath: string, scope: PackageScope): string {
  const key = createHash('sha256').update(`${host}\0${filePath}\0${scope}`).digest('hex');
  return path.join(directory, `upload-${key}.json`);
}

async function slice(filePath: string, offset: number, length: number): Promise<Buffer> {
  const file = await open(filePath, 'r');
  try {
    const bytes = Buffer.allocUnsafe(length);
    const result = await file.read(bytes, 0, length, offset);
    if (result.bytesRead !== length) throw new Error('The resource package file changed during upload');
    return bytes;
  } finally { await file.close(); }
}

async function transientRetry<T>(operation: () => Promise<T>, maxAttempts: number): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      const transient = isTransientResourcePackageError(error);
      if (!transient || attempt + 1 >= maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    }
  }
}

export async function uploadPackage(ctx: RuntimeContext, input: {
  filePath: string; scope: PackageScope; uploadId?: string; requestKey?: string; stateRoot?: string;
}): Promise<{ completed: CompletedUpload; statePath: string; requestKey: string }> {
  const absolute = path.resolve(input.filePath);
  const before = await lstat(absolute).catch(() => undefined);
  if (!before?.isFile() || before.isSymbolicLink() || before.size < 1 ||
    path.extname(absolute).toLowerCase() !== '.zip') {
    throw new Error('--file must point to a non-empty regular .zip file');
  }
  const directory = input.stateRoot ?? stateDirectory();
  await ensureDirectory(directory);
  const savedPath = statePath(directory, ctx.host(), absolute, input.scope);
  let saved = await loadJson<UploadState>(savedPath);
  if (saved && (!sameIdentity(saved, before) || saved.host !== ctx.host() || saved.scope !== input.scope)) {
    await removeFile(savedPath); saved = undefined;
  }
  let upload: Upload | undefined;
  const candidate = input.uploadId || saved?.uploadId;
  if (candidate) {
    try {
      upload = await requestResourcePackageApi(ctx, 'GET',
        `/api/resource-packages/uploads/${encodeURIComponent(candidate)}`);
    } catch (error) {
      if (input.uploadId || !(error instanceof TeAgentApiError) ||
        (error.status !== 404 && error.status !== 410 && error.code !== 'UPLOAD_EXPIRED')) throw error;
      await removeFile(savedPath); saved = undefined;
    }
  }
  if (upload && (upload.fileName !== path.basename(absolute) ||
    upload.totalBytes !== before.size || upload.scope !== input.scope ||
    !['uploading', 'completed'].includes(upload.status))) {
    if (input.uploadId) throw new Error('--upload-id does not match the selected ZIP and scope');
    upload = undefined; await removeFile(savedPath);
  }
  if (!upload) {
    upload = await requestResourcePackageApi(ctx, 'POST', '/api/resource-packages/uploads', {
      fileName: path.basename(absolute), totalBytes: before.size, scope: input.scope,
    });
  }
  if (!upload) throw new Error('The service did not create an upload');
  const active = upload;
  if (saved?.requestKey && input.requestKey && saved.requestKey !== input.requestKey) {
    throw new Error('--request-key differs from the existing upload state; reuse its original key');
  }
  const requestKey = input.requestKey || saved?.requestKey || randomUUID();
  const trustedLocalState = Boolean(saved && saved.uploadId === active.id &&
    sameIdentity(saved, before));
  const state: UploadState = {
    version: 1, host: ctx.host(), filePath: absolute, scope: input.scope,
    uploadId: active.id, size: before.size, mtimeMs: before.mtimeMs, dev: before.dev, ino: before.ino,
    requestKey,
  };
  await saveJson(savedPath, state);
  if (active.status === 'uploading') {
    const limits = await requestResourcePackageApi<{ desktopUploadConcurrency: number; uploadChunkRetries: number }>(
      ctx, 'GET', '/api/resource-packages/limits');
    const concurrency = Math.max(1, Math.min(8, limits.desktopUploadConcurrency || 3));
    const maxAttempts = Math.max(1, Math.min(10, limits.uploadChunkRetries || 3));
    const done = new Set(active.parts ?? []);
    const pending = Array.from({ length: active.totalChunks }, (_, index) => index)
      .filter((index) => !trustedLocalState || !done.has(index));
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
      while (next < pending.length) {
        const part = pending[next++];
        const offset = part * active.chunkBytes;
        const bytes = await slice(absolute, offset, Math.min(active.chunkBytes, before.size - offset));
        const digest = createHash('sha256').update(bytes).digest('hex');
        await transientRetry(async () => {
          const response = await requestResourcePackageRaw(ctx, 'PUT',
            `/api/resource-packages/uploads/${encodeURIComponent(active.id)}/chunks/${part}`, {
              body: new Uint8Array(bytes), timeoutMs: 120_000,
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': String(bytes.length), 'X-Chunk-Sha256': digest,
              },
            });
          await response.body?.cancel();
        }, maxAttempts);
      }
    }));
  }
  const after = await stat(absolute);
  if (!sameIdentity(before, after)) {
    throw new Error('The resource package file changed during upload; retry with the unchanged ZIP');
  }
  const completed = await requestResourcePackageApi<CompletedUpload>(ctx, 'POST',
    `/api/resource-packages/uploads/${encodeURIComponent(active.id)}/complete`, {});
  return { completed, statePath: savedPath, requestKey };
}

export async function clearUploadState(filePath: string): Promise<void> {
  await removeFile(filePath);
}

function artifactFileName(response: Response): string | undefined {
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return path.basename(decodeURIComponent(encoded.trim())); }
    catch { return path.basename(encoded.trim()); }
  }
  const ordinary = disposition.match(/filename="([^"]+)"/i)?.[1]
    ?? disposition.match(/filename=([^;]+)/i)?.[1];
  return ordinary ? path.basename(ordinary.trim()) : undefined;
}

async function fileHash(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

export async function downloadArtifact(
  ctx: RuntimeContext, task: PackageTask, outputPath?: string, timezone?: string,
): Promise<{ path: string; bytes: number; sha256: string }> {
  const query = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
  const url = `/api/resource-packages/tasks/${encodeURIComponent(task.id)}/artifact${query}`;
  const head = await requestResourcePackageRaw(ctx, 'HEAD', url);
  const totalBytes = Number(head.headers.get('content-length'));
  if (!Number.isSafeInteger(totalBytes) || totalBytes < 1) throw new Error('Artifact Content-Length is invalid');
  const etag = head.headers.get('etag') || '';
  const output = path.resolve(outputPath ?? artifactFileName(head) ?? `resource-package-${task.id}.zip`);
  try {
    await lstat(output);
    throw new Error(`Output file already exists: ${output}`);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const partial = `${output}.part`;
  const metadataPath = `${partial}.json`;
  let offset = 0;
  try {
    const info = await lstat(partial);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Unsafe partial file: ${partial}`);
    const metadata = await loadJson<DownloadState>(metadataPath);
    if (!etag || !metadata || metadata.host !== ctx.host() || metadata.taskId !== task.id ||
      metadata.etag !== etag || metadata.totalBytes !== totalBytes || info.size > totalBytes) {
      throw new Error(`Partial artifact cannot be resumed safely: ${partial}`);
    }
    offset = info.size;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (offset === 0) {
    await saveJson(metadataPath, { version: 1, host: ctx.host(), taskId: task.id, etag, totalBytes } satisfies DownloadState);
  }
  if (offset < totalBytes) {
    const response = await requestResourcePackageRaw(ctx, 'GET', url, {
      headers: offset ? { Range: `bytes=${offset}-`, 'If-Range': etag } : undefined,
      timeoutMs: 120_000,
    });
    if ((offset && response.status !== 206) || (!offset && response.status !== 200)) {
      throw new Error('Artifact server returned an unexpected range status');
    }
    if (etag && response.headers.get('etag') !== etag) throw new Error('Artifact changed while downloading');
    if (offset && response.headers.get('content-range') !== `bytes ${offset}-${totalBytes - 1}/${totalBytes}`) {
      throw new Error('Artifact server returned a mismatched Content-Range');
    }
    if (!response.body) throw new Error('Artifact response body is empty');
    await pipeline(
      Readable.fromWeb(response.body as never),
      createWriteStream(partial, { flags: offset ? 'a' : 'wx', mode: 0o600 }),
    );
  }
  const info = await stat(partial);
  if (info.size !== totalBytes) throw new Error(`Artifact size mismatch: expected ${totalBytes}, got ${info.size}`);
  const sha256 = await fileHash(partial);
  if (!task.packageSha256 || !/^[a-f0-9]{64}$/.test(task.packageSha256)) {
    throw new Error('Export task does not provide a valid package SHA-256 for verification');
  }
  if (sha256 !== task.packageSha256) {
    throw new Error(`Artifact SHA-256 mismatch: expected ${task.packageSha256}, got ${sha256}`);
  }
  await link(partial, output);
  await removeFile(partial);
  await removeFile(metadataPath);
  return { path: output, bytes: totalBytes, sha256 };
}
