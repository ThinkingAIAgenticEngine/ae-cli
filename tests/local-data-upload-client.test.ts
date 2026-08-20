import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const temporaryHome = mkdtempSync(join(tmpdir(), 'ae-local-data-upload-client-'));
process.env.HOME = temporaryHome;

const { localDataUpload, LocalDataUploadError } = await import('../src/core/local-data-upload-client.js');
const secretBody = 'UNIQUE_LOCAL_DATA_BODY_7d621e';
const secretEndpointMarker = 'secret-sync-target';
const requests: Array<{ url: string; headers: IncomingMessage['headers']; body: string; raw: Buffer }> = [];
let flakyCalls = 0;

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks);
  const body = raw.toString('utf8');
  requests.push({ url: req.url ?? '', headers: req.headers, body, raw });
  if (req.url === '/sync_json') return json(res, 200, { code: 0, msg: 'success' });
  if (req.url === '/reject') return json(res, 200, { code: -1, msg: secretBody });
  if (req.url === '/invalid') return json(res, 200, { msg: 'missing code' });
  if (req.url === '/redirect') {
    res.writeHead(302, { location: '/sync_json' });
    return res.end();
  }
  if (req.url === '/timeout') {
    return setTimeout(() => json(res, 200, { code: 0 }), 120);
  }
  if (req.url === '/flaky-500') {
    flakyCalls += 1;
    if (flakyCalls <= 2) return json(res, 500, { code: -1, msg: secretBody });
    return json(res, 200, { code: 0, msg: 'success' });
  }
  if (req.url === '/not-found') return json(res, 404, { code: -1, msg: 'nope' });
  return json(res, 500, { code: -1, msg: secretBody });
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  let injectedInit: RequestInit | undefined;
  await localDataUpload(`https://${secretEndpointMarker}.example.test/sync_json`, '[{"probe":true}]', {
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      injectedInit = init;
      return new Response('{"code":0,"msg":"success"}', { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(injectedInit?.method, 'POST');
  assert.equal(injectedInit?.redirect, 'manual');
  assert.deepEqual(injectedInit?.headers, { 'Content-Type': 'application/json', 'Accept': 'application/json' });
  assert.equal((injectedInit?.headers as Record<string, string>).Authorization, undefined);
  assert.equal((injectedInit?.headers as Record<string, string>)['Content-Encoding'], undefined);

  const losslessBody = `[{"appid":"app-secret","debug":0,"data":{"#type":"track","big":9223372036854775807,"marker":"${secretBody}"}}]`;
  const success = await localDataUpload(`${baseUrl}/sync_json`, losslessBody);
  assert.equal(success.code, 0);
  assert.equal(requests[0].body, losslessBody);
  assert.match(requests[0].body, /9223372036854775807/);
  assert.equal(requests[0].headers.authorization, undefined);
  assert.equal(requests[0].headers['cli-token'], undefined);
  assert.equal(requests[0].headers['access-token'], undefined);
  assert.equal(requests[0].headers['content-encoding'], undefined);

  // gzip compression: Content-Encoding header set, body roundtrips losslessly, still no auth.
  const gzipBody = `[{"appid":"app-secret","debug":0,"data":{"#type":"track","n":${Number.MAX_SAFE_INTEGER}}}]`;
  const gzipResult = await localDataUpload(`${baseUrl}/sync_json`, gzipBody, { compress: 'gzip' });
  assert.equal(gzipResult.code, 0);
  const gzipRequest = requests[requests.length - 1];
  assert.equal(gzipRequest.headers['content-encoding'], 'gzip');
  assert.equal(gzipRequest.headers.authorization, undefined);
  assert.equal(gunzipSync(gzipRequest.raw).toString('utf8'), gzipBody);

  const rejected = await capture(`${baseUrl}/reject`);
  assert.equal(rejected.code, -1);
  assert.doesNotMatch(rejected.message, new RegExp(secretBody));

  const invalid = await capture(`${baseUrl}/invalid`);
  assert.equal(invalid.code, 'LOCAL_DATA_UPLOAD_INVALID_RESPONSE');

  const serverError = await capture(`${baseUrl}/server-error`);
  assert.equal(serverError.code, 'LOCAL_DATA_UPLOAD_HTTP_500');
  assert.doesNotMatch(serverError.message, new RegExp(secretBody));

  const beforeRedirect = requests.length;
  const redirect = await capture(`${baseUrl}/redirect`);
  assert.equal(redirect.code, 'LOCAL_DATA_UPLOAD_REDIRECT_REJECTED');
  assert.equal(requests.length, beforeRedirect + 1, 'redirect must not be followed');

  const beforeTimeout = requests.length;
  const timeout = await capture(`${baseUrl}/timeout`, 20);
  assert.equal(timeout.code, 'LOCAL_DATA_UPLOAD_TIMEOUT');
  assert.equal(timeout.meta?.delivery_state, 'unknown');
  assert.equal(timeout.meta?.retry_attempted, false);
  assert.equal(requests.length, beforeTimeout + 1, 'timeout must not retry');

  // HTTP 500 twice then success: retries exhaust then land.
  const flakyBefore = requests.length;
  const flaky = await localDataUpload(`${baseUrl}/flaky-500`, '[{"safe":true}]', { retries: 2, retryDelayMs: 1 });
  assert.equal(flaky.code, 0);
  assert.equal(requests.length, flakyBefore + 3, '500 must retry twice then succeed');

  // Network failures retry until a response arrives.
  let networkAttempts = 0;
  const network = await localDataUpload('https://network-retry.example.test/sync_json', '[{"safe":true}]', {
    retries: 2,
    retryDelayMs: 1,
    fetchImpl: (async () => {
      networkAttempts += 1;
      if (networkAttempts <= 2) throw new TypeError('fetch failed');
      return new Response('{"code":0,"msg":"success"}', { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(network.code, 0);
  assert.equal(networkAttempts, 3, 'network failures must retry');

  // 4xx is never retried.
  const notFoundBefore = requests.length;
  const notFound = await localDataUpload(`${baseUrl}/not-found`, '[{"safe":true}]', { retries: 2, retryDelayMs: 1 })
    .catch((error) => error as InstanceType<typeof LocalDataUploadError>);
  assert(notFound instanceof LocalDataUploadError);
  assert.equal(notFound.code, 'LOCAL_DATA_UPLOAD_HTTP_404');
  assert.equal(notFound.meta?.retry_attempted, false);
  assert.equal(requests.length, notFoundBefore + 1, '4xx must not retry');

  // Terminal 500 after exhausting retries stamps retry metadata.
  const terminalBefore = requests.length;
  const terminal = await localDataUpload(`${baseUrl}/server-error`, '[{"safe":true}]', { retries: 2, retryDelayMs: 1 })
    .catch((error) => error as InstanceType<typeof LocalDataUploadError>);
  assert(terminal instanceof LocalDataUploadError);
  assert.equal(terminal.code, 'LOCAL_DATA_UPLOAD_HTTP_500');
  assert.equal(terminal.meta?.retry_attempted, true);
  assert.equal(terminal.meta?.retry_count, 2);
  assert.equal(requests.length, terminalBefore + 3, 'terminal 500 must exhaust retries');

  const logs = readdirSync(join(temporaryHome, '.ae-cli', 'log'))
    .map((name) => readFileSync(join(temporaryHome, '.ae-cli', 'log', name), 'utf8'))
    .join('\n');
  assert.match(logs, /LOCAL_DATA_UPLOAD target_sha256=/);
  assert.doesNotMatch(logs, new RegExp(secretBody));
  assert.doesNotMatch(logs, new RegExp(secretEndpointMarker));
  assert.doesNotMatch(logs, /app-secret/);
  process.stdout.write('local data upload client tests: passed\n');
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(temporaryHome, { recursive: true, force: true });
}

async function capture(endpoint: string, timeoutMs?: number): Promise<InstanceType<typeof LocalDataUploadError>> {
  try {
    await localDataUpload(endpoint, '[{"safe":true}]', timeoutMs === undefined ? {} : { timeoutMs });
    assert.fail('Expected LocalDataUploadError');
  } catch (error) {
    assert(error instanceof LocalDataUploadError);
    return error;
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
