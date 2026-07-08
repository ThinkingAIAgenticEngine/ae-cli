/**
 * capability-api unit tests — capability gateway transport
 *
 * Run:
 *   npx tsx tests/capability-api.test.ts
 */

import assert from 'node:assert/strict';
import {
  buildApiUrl,
  buildCapabilityGatewayUrl,
  callCapabilityApi,
  executeCapability,
  inspectCapability,
  listCapabilities,
} from '../src/core/capability-api.ts';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.ts';
import { PermissionError } from '../src/core/errors.ts';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`    ${msg}\n`);
  }
}

process.stdout.write('\ncapability-api tests\n');

await test('buildCapabilityGatewayUrl: domain + v1 path + query params', () => {
  const url = buildCapabilityGatewayUrl(
    'https://ta.example.com',
    'metadata',
    'capabilities/metadata.event.get',
    { debug: 1 },
  );
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/api/cli/metadata/v1/capabilities/metadata.event.get');
  assert.equal(parsed.searchParams.get('debug'), '1');
});

await test('buildApiUrl: legacy alias maps to v1 path', () => {
  const url = buildApiUrl('https://ta.example.com/', '/metadata/', '/capabilities/');
  assert.equal(url, 'https://ta.example.com/api/cli/metadata/v1/capabilities');
});

await test('listCapabilities sends cli-token header', async () => {
  const host = 'https://test-cap-list.internal';
  clearCliToken(host);
  setCliTokenManual('cli-list-token', host);

  let capturedHeader: string | undefined;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeader = (init?.headers as Record<string, string>)?.['cli-token'];
    return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await listCapabilities(host, 'metadata');
    assert.equal(capturedHeader, 'cli-list-token');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability POSTs { input } to .../execute', async () => {
  const host = 'https://test-cap-exec.internal';
  clearCliToken(host);
  setCliTokenManual('cli-exec-token', host);

  let capturedUrl = '';
  let capturedBody: any;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body;
    return new Response(JSON.stringify({ ok: true, data: { event_name: 'x' } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await executeCapability(host, 'metadata', 'metadata.event.get', {
      project_id: 1,
      event_name: 'purchase',
    });
    assert.ok(capturedUrl.includes('/api/cli/metadata/v1/capabilities/metadata.event.get/execute'));
    assert.equal(capturedBody, JSON.stringify({ input: { project_id: 1, event_name: 'purchase' } }));
    assert.equal(JSON.stringify(result), JSON.stringify({ event_name: 'x' }));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('inspectCapability GETs capability metadata', async () => {
  const host = 'https://test-cap-inspect.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  let capturedUrl = '';
  let method = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    method = init?.method ?? 'GET';
    return new Response(JSON.stringify({ ok: true, data: { id: 'metadata.event.get' } }), { status: 200 });
  }) as typeof fetch;

  try {
    await inspectCapability(host, 'metadata', 'metadata.event.get');
    assert.equal(method, 'GET');
    assert.ok(capturedUrl.endsWith('/api/cli/metadata/v1/capabilities/metadata.event.get'));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('callCapabilityApi: 403 → PermissionError, no retry', async () => {
  const host = 'https://test-capi-403.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  let callCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    callCount++;
    return new Response(JSON.stringify({ error: 'no permission for this project' }), { status: 403 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => callCapabilityApi(host, 'metadata', 'capabilities/metadata.event.get/execute', 'POST', { input: {} }),
      (err: Error) => {
        assert.ok(err instanceof PermissionError);
        return true;
      },
    );
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: 401 clears cache and retries once', async () => {
  const host = 'https://test-capi-401.internal';
  const { saveToken, clearToken } = await import('../src/core/auth.ts');
  clearCliToken(host);
  clearToken(host);
  setCliTokenManual('stale-token', host);
  saveToken('fake-access-token-for-401-test', host);

  let apiCallCount = 0;
  const seenTokens: string[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    const token = (init?.headers as Record<string, string> | undefined)?.['cli-token'];
    if (urlStr.includes('/v1/ta/cli/token/generate')) {
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'fresh-token' } }), { status: 200 });
    }
    apiCallCount++;
    seenTokens.push(token ?? '');
    if (apiCallCount === 1) {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await executeCapability(host, 'metadata', 'metadata.event.get', { project_id: 1, event_name: 'a' });
    assert.equal(apiCallCount, 2);
    assert.equal(seenTokens[0], 'stale-token');
    assert.equal(seenTokens[1], 'fresh-token');
    assert.equal(JSON.stringify(result), JSON.stringify({ ok: true }));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clearToken(host);
  }
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
