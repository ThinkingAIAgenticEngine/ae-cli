import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { PermissionError } from '../src/core/errors.ts';
import { downloadFromMainApp, TeAgentApiError } from '../src/core/te-agent-client.ts';

const host = 'https://download-system.test';
const root = await mkdtemp(join(tmpdir(), 'ae-cli-system-download-'));
const originalFetch = globalThis.fetch;

setCliTokenManual('system-download-token', host);

try {
  const successPath = join(root, 'success.csv');
  let requestedUrl = '';
  let requestHeaders: Record<string, string> = {};
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestHeaders = (init?.headers as Record<string, string>) ?? {};
    return new Response('a,b\r\n1,2', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="system-usage.csv"',
      },
    });
  }) as typeof fetch;

  const success = await downloadFromMainApp(
    '/api/admin/stats/export?groupBy=user',
    successPath,
    host,
  );
  assert.equal(requestedUrl, `${host}/agent/api/admin/stats/export?groupBy=user`);
  assert.equal(requestHeaders['cli-token'], 'system-download-token');
  assert.equal(success.path, successPath);
  assert.equal(success.bytes, 8);
  assert.equal(success.fileName, 'system-usage.csv');
  assert.equal(await readFile(successPath, 'utf8'), 'a,b\r\n1,2');

  const existingPath = join(root, 'existing.csv');
  await writeFile(existingPath, 'keep');
  let existingFetchCalled = false;
  globalThis.fetch = (async () => {
    existingFetchCalled = true;
    return new Response('replace');
  }) as typeof fetch;
  await assert.rejects(
    downloadFromMainApp('/api/admin/stats/export', existingPath, host),
    (error) => error instanceof TeAgentApiError && error.code === 'OUTPUT_EXISTS',
  );
  assert.equal(existingFetchCalled, false);
  assert.equal(await readFile(existingPath, 'utf8'), 'keep');

  const httpFailurePath = join(root, 'http-failure.csv');
  globalThis.fetch = (async () => new Response(
    JSON.stringify({ error: 'permission denied' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )) as typeof fetch;
  await assert.rejects(
    downloadFromMainApp('/api/admin/stats/export', httpFailurePath, host),
    (error) => error instanceof PermissionError && error.message === 'permission denied',
  );
  await assert.rejects(readFile(httpFailurePath), /ENOENT/);

  const streamFailurePath = join(root, 'stream-failure.csv');
  globalThis.fetch = (async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('partial'));
        controller.error(new Error('stream interrupted'));
      },
    });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
  await assert.rejects(
    downloadFromMainApp('/api/admin/stats/detailed-export', streamFailurePath, host),
    (error) => error instanceof TeAgentApiError && error.code === 'DOWNLOAD_ERROR',
  );
  await assert.rejects(readFile(streamFailurePath), /ENOENT/);
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
  await rm(root, { recursive: true, force: true });
}

process.stdout.write('te-agent download tests passed\n');
