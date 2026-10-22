import assert from 'node:assert/strict';
import { evalHeaders, resolveEvalBaseUrl } from '../src/commands/evaluation/shared.ts';
import { EvalApiError, evalRequest, redactEvalLogUrl } from '../src/core/eval-client.ts';

const bearerHeaders = evalHeaders({ AE_EVAL_ACCESS_TOKEN: 'test-access-token' });
assert.deepEqual(bearerHeaders, { Authorization: 'Bearer test-access-token' });

assert.throws(
  () => evalHeaders({}),
  (error: unknown) =>
    error instanceof EvalApiError && error.code === 'EVAL_ACCESS_TOKEN_MISSING',
);

const endpointContext = (endpoint: string) => ({ host: () => 'https://ae.example.com', str: (name: string) => (name === 'endpoint' ? endpoint : '') });
assert.equal(resolveEvalBaseUrl(endpointContext('https://ae.example.com/') as any, {}), 'https://ae.example.com');
// Both terminal and sandbox runtimes use the current host without a separate endpoint.
const previousRuntimeRoot = process.env.SANDBOX_RUNTIME_ROOT;
try {
  for (const sandbox of [false, true]) {
    if (sandbox) process.env.SANDBOX_RUNTIME_ROOT = '/tmp/evaluation-host-test';
    else delete process.env.SANDBOX_RUNTIME_ROOT;
    for (const origin of ['http://ae.example.com', 'https://ae.example.com', 'https://other-ae.example.com']) {
      for (const suffix of ['', '/', '/agent/']) {
        assert.equal(resolveEvalBaseUrl({ ...endpointContext(''), host: () => `${origin}${suffix}` } as any, {}), origin);
      }
    }
  }
} finally {
  if (previousRuntimeRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
  else process.env.SANDBOX_RUNTIME_ROOT = previousRuntimeRoot;
}
// Legacy settings can confirm the selected host, but cannot route its credentials elsewhere.
assert.equal(resolveEvalBaseUrl(endpointContext('https://ae.example.com/agenteval/api/v1/') as any, { AE_EVAL_BASE_URL: 'https://ae.example.com/agent' }), 'https://ae.example.com');
for (const legacyFlag of ['', 'https://ae.example.com']) {
  assert.throws(() => resolveEvalBaseUrl(endpointContext(legacyFlag) as any, { AE_EVAL_BASE_URL: 'https://other.example.com' }),
    (e: any) => e.code === 'EVAL_ENDPOINT_OVERRIDE_UNSUPPORTED');
}
assert.throws(() => resolveEvalBaseUrl(endpointContext('https://other.example.com') as any, {}),
  (e: any) => e.code === 'EVAL_ENDPOINT_OVERRIDE_UNSUPPORTED');
for (const host of ['ftp://ae.example.com', 'file:///tmp/evaluation']) {
  assert.throws(() => resolveEvalBaseUrl({ ...endpointContext(''), host: () => host } as any, {}),
    (e: any) => e.code === 'EVAL_ENDPOINT_INVALID');
}
for (const host of ['https://user:password@ae.example.com', 'https://ae.example.com?x=1', 'https://ae.example.com#fragment', 'https://ae.example.com?', 'https://ae.example.com#']) {
  assert.throws(() => resolveEvalBaseUrl({ ...endpointContext(''), host: () => host } as any, {}),
    (e: any) => e.code === 'EVAL_ENDPOINT_INVALID');
}
for (const hostname of ['localhost', 'localhost.', 'app.localhost', '127.0.0.1', '127.1', '0.0.0.0', '[::1]', '[0:0:0:0:0:0:0:1]', '[::]', '[::ffff:127.0.0.1]', '[::ffff:7f00:1]']) {
  assert.throws(() => resolveEvalBaseUrl({ ...endpointContext(''), host: () => `https://${hostname}:8080` } as any, {}),
    (e: any) => e.code === 'EVAL_ENDPOINT_LOOPBACK_UNSUPPORTED', hostname);
}
// Match other AE domains: the selected host determines HTTP versus HTTPS.
for (const protocol of ['http', 'https']) {
  await evalRequest({ baseUrl: `${protocol}://ae.example.com`, path: '/agenteval/api/v1/datasets', method: 'GET', headers: bearerHeaders,
    fetchImpl: async (input, init) => {
      assert.equal(String(input), `${protocol}://ae.example.com/agenteval/api/v1/datasets`);
      assert.equal(init?.redirect, 'error');
      return new Response('{}');
    },
  });
}

let capturedUrl = '';
let capturedHeaders = new Headers();
await evalRequest({
  baseUrl: 'https://ae.example.com',
  headers: bearerHeaders,
  method: 'GET',
  path: '/agenteval/api/v1/evaluation-runs',
  params: { search: 'private agent output' },
  fetchImpl: async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  },
});

assert.match(capturedUrl, /search=private\+agent\+output/);
assert.equal(capturedHeaders.get('Authorization'), 'Bearer test-access-token');
assert.equal(
  redactEvalLogUrl('https://user:password@ae.example.com/agenteval/api/v1/evaluation-runs?search=private#fragment'),
  'https://ae.example.com/agenteval/api/v1/evaluation-runs',
);
assert.equal(redactEvalLogUrl('not a URL'), '[invalid evaluation URL]');

console.log('evaluation client tests passed');

// Binary downloads preserve bytes, never overwrite files, and remove failed output.
const { mkdtemp, readFile, stat, rm } = await import('node:fs/promises');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const { evalDownloadFile } = await import('../src/core/eval-client.ts');
const { CliValidationError } = await import('../src/core/errors.ts');
const dir = await mkdtemp(join(tmpdir(), 'evaluation-download-'));
try {
  const output = join(dir, 'attachment.bin');
  const payload = new Uint8Array([0, 255, 128, 10, 13, 42]);
  let requests = 0;
  const options = {
    baseUrl: 'https://eval.example.com', headers: bearerHeaders, method: 'GET',
    path: '/agenteval/api/v1/files/file-1/content',
    fetchImpl: (async (_input: any, init: any) => {
      requests++;
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer test-access-token');
      assert.equal(init.redirect, 'error');
      assert.equal(init.body, undefined);
      assert.ok(new Headers(init.headers).get('Accept')?.includes('application/octet-stream'));
      return new Response(payload, { headers: { 'Content-Type': 'application/octet-stream' } });
    }) as typeof fetch,
  };
  assert.deepEqual(await evalDownloadFile(options, output), { path: output, byte_size: payload.length });
  assert.deepEqual(new Uint8Array(await readFile(output)), payload);
  assert.equal((await stat(output)).mode & 0o777, 0o600);
  await assert.rejects(evalDownloadFile(options, output),
    (e: unknown) => e instanceof CliValidationError && e.code === 'EVAL_OUTPUT_EXISTS');
  assert.equal(requests, 1, 'existing output must fail before an HTTP request');
  assert.deepEqual(new Uint8Array(await readFile(output)), payload);

  for (const [status, code] of [[403, 'FORBIDDEN'], [404, 'NOT_FOUND'], [422, 'VALIDATION_ERROR'], [410, 'DOWNLOAD_EXPIRED']] as const) {
    const failedOutput = join(dir, `failed-${status}`);
    await assert.rejects(evalDownloadFile({ ...options,
      fetchImpl: (async () => new Response(JSON.stringify({ error: { code, message: 'Unavailable file' } }), { status })) as typeof fetch,
    }, failedOutput), (e: unknown) => e instanceof EvalApiError && e.httpStatus === status && e.code === code);
    await assert.rejects(stat(failedOutput), { code: 'ENOENT' });
  }
  const brokenOutput = join(dir, 'broken');
  await assert.rejects(evalDownloadFile({ ...options, fetchImpl: (async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(payload); controller.error(new Error('stream failed')); },
  }))) as typeof fetch }, brokenOutput), (e: unknown) => e instanceof EvalApiError && e.code === 'EVAL_API_NETWORK_ERROR');
  await assert.rejects(stat(brokenOutput), { code: 'ENOENT' });

  const timeoutOutput = join(dir, 'timeout');
  await assert.rejects(evalDownloadFile({ ...options, timeoutMs: 5,
    fetchImpl: (async (_input: any, init: any) => new Response(new ReadableStream({
      start(controller) { init.signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true }); },
    }))) as typeof fetch,
  }, timeoutOutput), (e: unknown) => e instanceof EvalApiError && e.code === 'EVAL_API_TIMEOUT');
  await assert.rejects(stat(timeoutOutput), { code: 'ENOENT' });

  await assert.rejects(evalDownloadFile({ ...options, fetchImpl: (async () => { throw new TypeError('redirect rejected'); }) as typeof fetch }, join(dir, 'redirect')),
    (e: unknown) => e instanceof EvalApiError && e.code === 'EVAL_API_NETWORK_ERROR');
  await assert.rejects(stat(join(dir, 'redirect')), { code: 'ENOENT' });
} finally {
  await rm(dir, { recursive: true, force: true });
}
console.log('evaluation binary download tests passed');
