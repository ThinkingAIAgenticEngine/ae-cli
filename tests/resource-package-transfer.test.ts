import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { RuntimeContext } from '../src/framework/types.ts';

const temporary = await mkdtemp(path.join(os.tmpdir(), 'ae-resource-package-test-'));
process.env.SANDBOX_RUNTIME_ROOT = temporary;
await mkdir(path.join(temporary, '.ae-config'));
await writeFile(path.join(temporary, '.ae-config', 'cli-token.json'), JSON.stringify({
  url: 'https://resource-package.test', token: 'cli_test_token',
}));

const { uploadPackage, downloadArtifact } = await import('../src/commands/te-agent/resource-package-transfer.ts');
const { requestResourcePackageApi } = await import('../src/commands/te-agent/api-client.ts');
const ctx = { host: () => 'https://resource-package.test' } as RuntimeContext;
const zip = path.join(temporary, 'resources.zip');
await writeFile(zip, 'ABCDEF');
const digest = createHash('sha256').update('ABCDEF').digest('hex');

let initializations = 0;
let chunkZero = 0;
let chunkOne = 0;
let breakAfterFirstChunk = true;
let temporaryGetFailure = false;
let transientPartFailures = 0;
let chunkHeadersValid = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  const headers = new Headers(init?.headers);
  if (url.includes('/v1/ta/cli/token/renew')) return new Response('', { status: 404 });
  assert.equal(headers.get('cli-token'), 'cli_test_token');
  if (url.endsWith('/api/resource-packages/uploads') && init?.method === 'POST') {
    initializations += 1;
    return Response.json({ id: 'upload-1', scope: 'company', fileName: 'resources.zip',
      totalBytes: 6, chunkBytes: 3, totalChunks: 2, parts: [], status: 'uploading' });
  }
  if (url.endsWith('/api/resource-packages/uploads/upload-1') && init?.method === 'GET') {
    if (temporaryGetFailure) throw new Error('temporary network failure');
    return Response.json({ id: 'upload-1', scope: 'company', fileName: 'resources.zip',
      totalBytes: 6, chunkBytes: 3, totalChunks: 2, parts: [0], status: 'uploading' });
  }
  if (url.endsWith('/api/resource-packages/limits')) {
    return Response.json({ desktopUploadConcurrency: 1, uploadChunkRetries: 2 });
  }
  if (url.endsWith('/chunks/0')) {
    chunkZero += 1;
    chunkHeadersValid = headers.get('x-chunk-sha256') === createHash('sha256').update('ABC').digest('hex') &&
      headers.get('content-length') === '3';
    assert.equal(Buffer.from(init?.body as Uint8Array).toString(), 'ABC');
    return Response.json({ partNumber: 0 });
  }
  if (url.endsWith('/chunks/1')) {
    chunkOne += 1;
    assert.equal(Buffer.from(init?.body as Uint8Array).toString(), 'DEF');
    if (breakAfterFirstChunk) return Response.json({ error: 'Stop for test', errorCode: 'STOP' }, { status: 400 });
    if (transientPartFailures-- > 0) return Response.json({ error: 'Retry later' }, { status: 503 });
    return Response.json({ partNumber: 1 });
  }
  if (url.endsWith('/api/resource-packages/uploads/upload-1/complete')) {
    return Response.json({ uploadId: 'upload-1', packageSha256: digest, manifest: {},
      preflight: { snapshotId: 'a'.repeat(64), status: 'ready', blockers: [], warnings: [], confirmations: [] },
      duplicateImport: null });
  }
  throw new Error(`Unexpected request ${init?.method} ${url}`);
};

try {
  const stateRoot = path.join(temporary, 'state');
  await assert.rejects(uploadPackage(ctx, { filePath: zip, scope: 'company', stateRoot }), /Stop for test/);
  const stateFiles = await readdir(stateRoot);
  assert.equal(stateFiles.length, 1);
  const firstState = JSON.parse(await readFile(path.join(stateRoot, stateFiles[0]), 'utf8')) as { requestKey: string };
  temporaryGetFailure = true;
  await assert.rejects(uploadPackage(ctx, { filePath: zip, scope: 'company', stateRoot }), /Network request failed/);
  assert.equal(initializations, 1, 'a transient upload lookup error must not create another upload');
  assert.deepEqual(JSON.parse(await readFile(path.join(stateRoot, stateFiles[0]), 'utf8')), firstState);
  temporaryGetFailure = false;
  breakAfterFirstChunk = false;
  transientPartFailures = 2;
  await assert.rejects(uploadPackage(ctx, { filePath: zip, scope: 'company', stateRoot }), /Retry later/);
  assert.equal(chunkOne, 3, 'the server retry limit permits two attempts total');
  const upload = await uploadPackage(ctx, { filePath: zip, scope: 'company', stateRoot });
  assert.equal(upload.completed.uploadId, 'upload-1');
  const saved = JSON.parse(await readFile(upload.statePath, 'utf8')) as { requestKey?: string };
  assert.equal(upload.requestKey, saved.requestKey);
  assert.equal(upload.requestKey, firstState.requestKey);
  assert.ok(upload.requestKey);
  assert.equal(initializations, 1);
  assert.equal(chunkZero, 1);
  assert.equal(chunkOne, 4);
  assert.equal(chunkHeadersValid, true);
  await uploadPackage(ctx, { filePath: zip, scope: 'company', uploadId: 'upload-1',
    stateRoot: path.join(temporary, 'another-process-state') });
  assert.equal(chunkZero, 2, 'an explicit upload ID without matching local state must verify existing parts');
  assert.equal(initializations, 1);

  const output = path.join(temporary, 'export.zip');
  const etag = `"sha256-${digest}"`;
  await writeFile(`${output}.part`, 'ABC');
  await writeFile(`${output}.part.json`, JSON.stringify({ version: 1,
    host: ctx.host(), taskId: 'task-1', etag, totalBytes: 6 }));
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.ok(url.endsWith('/api/resource-packages/tasks/task-1/artifact'));
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('cli-token'), 'cli_test_token');
    if (init?.method === 'HEAD') return new Response(null, { headers: {
      'Content-Length': '6', ETag: etag,
      'Content-Disposition': 'attachment; filename="export.zip"',
    } });
    assert.equal(headers.get('range'), 'bytes=3-');
    return new Response('DEF', { status: 206, headers: {
      ETag: etag, 'Content-Range': 'bytes 3-5/6', 'Content-Length': '3',
    } });
  };
  const result = await downloadArtifact(ctx, {
    id: 'task-1', kind: 'export', scope: 'personal', status: 'succeeded',
    artifactAvailable: true, packageSha256: digest,
  }, output);
  assert.deepEqual(result, { path: output, bytes: 6, sha256: digest });
  assert.equal((await readFile(output)).toString(), 'ABCDEF');
  const invalidOutput = path.join(temporary, 'changed-export.zip');
  await writeFile(`${invalidOutput}.part`, 'ABC');
  await writeFile(`${invalidOutput}.part.json`, JSON.stringify({ version: 1,
    host: ctx.host(), taskId: 'task-1', etag, totalBytes: 6 }));
  globalThis.fetch = async (_input, init) => init?.method === 'HEAD'
    ? new Response(null, { headers: { 'Content-Length': '6', ETag: etag } })
    : new Response('ABCDEF', { status: 200, headers: { ETag: etag } });
  await assert.rejects(downloadArtifact(ctx, {
    id: 'task-1', kind: 'export', scope: 'personal', status: 'succeeded',
    artifactAvailable: true, packageSha256: digest,
  }, invalidOutput), /unexpected range status/);
  assert.equal((await readFile(`${invalidOutput}.part`)).toString(), 'ABC');
  const unsafeOutput = path.join(temporary, 'unsafe-export.zip');
  await writeFile(`${unsafeOutput}.part`, 'ABC');
  await symlink(`${invalidOutput}.part.json`, `${unsafeOutput}.part.json`);
  await assert.rejects(downloadArtifact(ctx, {
    id: 'task-1', kind: 'export', scope: 'personal', status: 'succeeded',
    artifactAvailable: true, packageSha256: digest,
  }, unsafeOutput), /Invalid transfer metadata/);
  const missingDigestOutput = path.join(temporary, 'missing-digest.zip');
  globalThis.fetch = async (_input, init) => init?.method === 'HEAD'
    ? new Response(null, { headers: { 'Content-Length': '6', ETag: etag } })
    : new Response('ABCDEF', { headers: { ETag: etag } });
  await assert.rejects(downloadArtifact(ctx, {
    id: 'task-1', kind: 'export', scope: 'personal', status: 'succeeded',
    artifactAvailable: true, packageSha256: null,
  }, missingDigestOutput), /valid package SHA-256/);
  await assert.rejects(readFile(missingDigestOutput), /ENOENT/);
  let unauthorizedAttempts = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes('/v1/ta/cli/token/renew')) return new Response('', { status: 404 });
    unauthorizedAttempts += 1;
    return unauthorizedAttempts === 1
      ? Response.json({ error: 'Expired token' }, { status: 401 })
      : Response.json({ desktopUploadConcurrency: 1, uploadChunkRetries: 2 });
  };
  await requestResourcePackageApi(ctx, 'GET', '/api/resource-packages/limits');
  assert.equal(unauthorizedAttempts, 2, '401 retries exactly once');
  globalThis.fetch = async () => Response.json({
    error: 'Preflight changed', errorCode: 'PREFLIGHT_CHANGED',
    preflight: { snapshotId: 'b'.repeat(64), blockers: [], warnings: [], confirmations: [] },
  }, { status: 409 });
  await assert.rejects(
    requestResourcePackageApi(ctx, 'POST', '/api/resource-packages/uploads/upload-1/confirm', {}),
    (error: unknown) => (error as { code?: string }).code === 'PREFLIGHT_CHANGED',
  );
} finally {
  globalThis.fetch = originalFetch;
}

process.stdout.write('resource package transfer tests passed\n');
