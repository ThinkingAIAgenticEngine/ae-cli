/**
 * capability-api unit tests — capability gateway transport
 *
 * Run:
 *   npx tsx tests/capability-api.test.ts
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildApiUrl,
  buildCapabilityGatewayUrl,
  callCapabilityApi,
  CapabilityGatewayError,
  dryRunCapability,
  executeCapability,
  executeCapabilityWithEnvelope,
  inspectCapability,
  listCapabilities,
  uploadInputFileBytes,
  validateCapability,
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

  let capturedToken: string | undefined;
  let capturedSource: string | undefined;
  let capturedUrl = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedToken = (init?.headers as Record<string, string>)?.['cli-token'];
    capturedSource = (init?.headers as Record<string, string>)?.['X-Source'];
    return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await listCapabilities(host, 'metadata', 42);
    assert.equal(capturedToken, 'cli-list-token');
    assert.equal(capturedSource, 'ae-cli');
    assert.equal(new URL(capturedUrl).searchParams.get('project_id'), '42');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('listCapabilities marks sandbox calls as te-agent', async () => {
  const host = 'https://test-cap-agent-source.internal';
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-agent-source-'));
  const previousSandboxRoot = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = sandboxRoot;
  fs.mkdirSync(path.join(sandboxRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(
    path.join(sandboxRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-agent-token' }),
  );
  clearCliToken(host);
  setCliTokenManual('cli-agent-token', host);

  let capturedSource: string | undefined;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedSource = (init?.headers as Record<string, string>)?.['X-Source'];
    return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await listCapabilities(host, 'analysis', 20);
    assert.equal(capturedSource, 'te-agent');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    if (previousSandboxRoot === undefined) {
      delete process.env.SANDBOX_RUNTIME_ROOT;
    } else {
      process.env.SANDBOX_RUNTIME_ROOT = previousSandboxRoot;
    }
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
});

await test('listCapabilities omits project_id for company-level discovery', async () => {
  const host = 'https://test-cap-list-company.internal';
  clearCliToken(host);
  setCliTokenManual('cli-list-company-token', host);

  let capturedUrl = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await listCapabilities(host, 'metadata');
    assert.equal(new URL(capturedUrl).searchParams.has('project_id'), false);
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

await test('executeCapability preserves unsafe IDs and keeps long decimals numeric', async () => {
  const host = 'https://test-cap-numeric-contract.internal';
  clearCliToken(host);
  setCliTokenManual('cli-numeric-token', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      '{"ok":true,"data":{"id":1524788894514548736,'
        + '"average_response_seconds":5401.925531914893}}',
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const result = await executeCapability(host, 'community', 'community.chat.service_metrics', {});
    assert.equal(result.id, '1524788894514548736');
    assert.equal(typeof result.average_response_seconds, 'number');
    assert.equal(result.average_response_seconds, Number('5401.925531914893'));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('dryRunCapability POSTs { input } to .../dry-run', async () => {
  const host = 'https://test-cap-dry-run.internal';
  clearCliToken(host);
  setCliTokenManual('cli-dry-run-token', host);

  let capturedUrl = '';
  let capturedBody: any;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await dryRunCapability(host, 'analysis', 'analysis.report.list', { project_id: 1 });
    assert.ok(capturedUrl.endsWith('/api/cli/analysis/v1/capabilities/analysis.report.list/dry-run'));
    assert.equal(capturedBody, JSON.stringify({ input: { project_id: 1 } }));
    assert.equal(JSON.stringify(result), JSON.stringify({ dry_run: true }));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('validateCapability POSTs { input } to .../validate', async () => {
  const host = 'https://test-cap-validate.internal';
  clearCliToken(host);
  setCliTokenManual('cli-validate-token', host);

  let capturedUrl = '';
  let capturedBody: any;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body;
    return new Response(JSON.stringify({
      ok: true,
      data: { valid: true, capability_id: 'metadata.data_table.sql_write', normalized_input: { project_id: 1 } },
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await validateCapability(host, 'analysis', 'metadata.data_table.sql_write', {
      project_id: 1,
      operation: 'create',
    });
    assert.ok(capturedUrl.endsWith('/api/cli/analysis/v1/capabilities/metadata.data_table.sql_write/validate'));
    assert.equal(
      capturedBody,
      JSON.stringify({ input: { project_id: 1, operation: 'create' } }),
    );
    assert.equal(result.valid, true);
    assert.equal(result.capability_id, 'metadata.data_table.sql_write');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapabilityWithEnvelope preserves success metadata', async () => {
  const host = 'https://test-cap-envelope.internal';
  clearCliToken(host);
  setCliTokenManual('cli-envelope-token', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: true,
    data: { items: [] },
    meta: {
      request_id: 'cli_0123456789abcdef0123456789abcdef',
      invocation_id: 'inv_1',
    },
  }), { status: 200 })) as typeof fetch;

  try {
    const result = await executeCapabilityWithEnvelope(
      host,
      'analysis',
      'analysis.adhoc.run',
      { project_id: 1 },
    );
    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
      ok: true,
      data: { items: [] },
      meta: {
        request_id: 'cli_0123456789abcdef0123456789abcdef',
        invocation_id: 'inv_1',
      },
    });
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability exposes failure metadata on CapabilityGatewayError', async () => {
  const host = 'https://test-cap-error-meta.internal';
  clearCliToken(host);
  setCliTokenManual('cli-error-meta-token', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: false,
    error: {
      code: 'QUERY_FAILED',
      message: 'Query failed.',
    },
    meta: {
      request_id: 'cli_fedcba9876543210fedcba9876543210',
      invocation_id: 'inv_2',
    },
  }), { status: 422 })) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'analysis', 'analysis.adhoc.run', { project_id: 1 }),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.deepEqual(JSON.parse(JSON.stringify(err.meta)), {
          request_id: 'cli_fedcba9876543210fedcba9876543210',
          invocation_id: 'inv_2',
        });
        return true;
      },
    );
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
    return new Response(JSON.stringify({
      ok: false,
      error: {
        type: 'permission',
        code: 'CAPABILITY_PERMISSION_DENIED',
        message: 'no permission for this project',
      },
    }), { status: 403 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => callCapabilityApi(host, 'metadata', 'capabilities/metadata.event.get/execute', 'POST', { input: {} }),
      (err: Error) => {
        assert.ok(err instanceof PermissionError);
        assert.equal(err.code, 'CAPABILITY_PERMISSION_DENIED');
        return true;
      },
    );
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: non-2xx response exposes capability error body', async () => {
  const host = 'https://test-capi-422.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'DATA_TABLE_NOT_FOUND',
          message: 'Data table does not exist.',
          hint: 'Check data_table_id.',
        },
      }),
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'metadata', 'metadata.data_table.get', { project_id: 1, data_table_id: 1 }),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.match(err.message, /Data table does not exist/);
        assert.equal(err.code, 'DATA_TABLE_NOT_FOUND');
        assert.equal(err.hint, 'Check data_table_id.');
        assert.equal(err.httpStatus, 422);
        return true;
      },
    );
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: 401 clears cache and retries once', async () => {
  const host = 'https://test-capi-401.internal';
  const { save, clear } = await import('../src/core/secure-store.ts');
  clearCliToken(host);
  clear(host);
  setCliTokenManual('stale-token', host);
  save(host, {
    accessToken: 'fake-access-token-for-401-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });

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
    assert.ok(seenTokens[1]);
    assert.notEqual(seenTokens[1], 'stale-token');
    assert.equal(JSON.stringify(result), JSON.stringify({ ok: true }));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clear(host);
  }
});

await test('executeCapability: retry non-2xx response exposes capability error body', async () => {
  const host = 'https://test-capi-401-422.internal';
  const { save, clear } = await import('../src/core/secure-store.ts');
  clearCliToken(host);
  clear(host);
  setCliTokenManual('stale-token', host);
  save(host, {
    accessToken: 'fake-access-token-for-401-422-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });

  let apiCallCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    if (String(url).includes('/v1/ta/cli/token/generate')) {
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'fresh-token' } }), { status: 200 });
    }
    apiCallCount++;
    if (apiCallCount === 1) {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'INVALID_INPUT_FILE',
          message: 'Input file is invalid.',
        },
      }),
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'metadata', 'metadata.data_table.csv_write', { project_id: 1 }),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.match(err.message, /Input file is invalid/);
        assert.equal(err.code, 'INVALID_INPUT_FILE');
        assert.equal(err.httpStatus, 422);
        return true;
      },
    );
    assert.equal(apiCallCount, 2);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clear(host);
  }
});

await test('uploadInputFileBytes: non-2xx response exposes capability error body', async () => {
  const host = 'https://test-capi-upload-422.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'UPLOAD_PURPOSE_INVALID',
          message: 'Unsupported upload purpose.',
        },
      }),
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => uploadInputFileBytes(host, 'metadata', 1, 'data_table.csv', Buffer.from('id\n1\n'), 'data.csv'),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.match(err.message, /Unsupported upload purpose/);
        assert.equal(err.code, 'UPLOAD_PURPOSE_INVALID');
        assert.equal(err.httpStatus, 422);
        return true;
      },
    );
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: 403 invalid cli-token clears cache and retries once', async () => {
  const host = 'https://test-capi-invalid-token.internal';
  const { save, clear } = await import('../src/core/secure-store.ts');
  clearCliToken(host);
  clear(host);
  setCliTokenManual('stale-token', host);
  save(host, {
    accessToken: 'fake-access-token-for-invalid-cli-token-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });

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
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            type: 'permission',
            message: 'Your token is invalid. Please verify your token and try again.',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await executeCapability(host, 'metadata', 'metadata.data_table.list', { project_id: 1 });
    assert.equal(apiCallCount, 2);
    assert.equal(seenTokens[0], 'stale-token');
    assert.equal(seenTokens[1], 'fresh-token');
    assert.equal(JSON.stringify(result), JSON.stringify({ ok: true }));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clear(host);
  }
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
