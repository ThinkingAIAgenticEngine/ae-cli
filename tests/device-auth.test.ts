/**
 * device-auth unit tests
 *
 * Run:
 *   npx tsx tests/device-auth.test.ts
 *
 * Coverage:
 *   1. authorizeDevice: success returns DeviceAuthorizeResponse
 *   2. authorizeDevice: HTTP non-200 → throws error
 *   3. pollDeviceToken: 200 + tokens → {status:'approved', tokens}
 *   4. pollDeviceToken: 400 authorization_pending → {status:'pending'}
 *   5. pollDeviceToken: 400 slow_down → {status:'slow_down'}
 *   6. pollDeviceToken: 400 expired_token → {status:'expired'}
 *   7. pollDeviceToken: network error → {status:'error'}
 *   8. runDeviceFlow: pending → approved → returns tokens (mock poll state machine)
 *   9. runDeviceFlow: slow_down → interval increases by 5s
 *  10. runDeviceFlow: expired_token → throws "expired" error
 *  11. openBrowser: execFileSync throws → returns false, does not throw (I5: genuine catch-branch test)
 *  12. runDeviceFlow: --no-browser skips openBrowser call
 *  13. openBrowser: non-http/https protocol → returns false (C1 URL guard)
 *  14. openBrowser: invalid URL → returns false (C1 URL guard)
 *  15. runDeviceFlow: HTTP 401 → aborts immediately and throws (I4 abort-on-4xx)
 *  16. authorizeDevice: 404 → DeviceFlowUnsupportedError (F-012 old server)
 *  17. authorizeDevice: HTTP 200 + HTML SPA → DeviceFlowUnsupportedError (F-012)
 *  18. pollDeviceToken: 404 → {status:'unsupported'} (F-012)
 *  19. pollDeviceFlow: pending → approved returns tokens (split-flow resume)
 *  20. pollDeviceFlow: 404 during poll → DeviceFlowUnsupportedError, no retry-to-timeout (F-012)
 *  21. buildVerificationUrl: builds device-activate URL with encoded user_code
 */

import assert from 'node:assert/strict';
import {
  authorizeDevice,
  pollDeviceToken,
  pollDeviceFlow,
  runDeviceFlow,
  openBrowser,
  buildVerificationUrl,
  DeviceFlowUnsupportedError,
  type DeviceAuthorizeResponse,
  type DeviceTokenResponse,
} from '../src/core/device-auth.ts';

// ── helpers ──────────────────────────────────────────────────────────────────

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
    const stack = err instanceof Error && err.stack
      ? '\n    ' + err.stack.split('\n').slice(1, 4).join('\n    ')
      : '';
    process.stdout.write(`    ${msg}${stack}\n`);
  }
}

/** mock globalThis.fetch and restore after test */
function mockFetch(impl: typeof fetch): () => void {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  return () => { globalThis.fetch = orig; };
}

const HOST = 'https://ae.example.internal';

const MOCK_AUTH_RESP: DeviceAuthorizeResponse = {
  device_code: 'dc-test-1234',
  user_code: 'ABCD-EFGH',
  verification_uri: `${HOST}/device-activate`,
  verification_uri_complete: `${HOST}/device-activate?user_code=ABCD-EFGH`,
  expires_in: 300,
  interval: 5,
};

const MOCK_TOKEN_RESP: DeviceTokenResponse = {
  access_token: 'access-xyz',
  mcp_token: 'mcp-xyz',
  refresh_token: 'refresh-xyz',
  token_type: 'bearer',
  expires_in: 72000,
};

// ── tests ─────────────────────────────────────────────────────────────────────

process.stdout.write(`\ndevice-auth tests\n`);

// 1. authorizeDevice: success
await test('authorizeDevice: success returns DeviceAuthorizeResponse', async () => {
  const restore = mockFetch(async () =>
    new Response(JSON.stringify(MOCK_AUTH_RESP), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  try {
    const result = await authorizeDevice(HOST);
    assert.equal(result.device_code, 'dc-test-1234');
    assert.equal(result.user_code, 'ABCD-EFGH');
    assert.ok(result.verification_uri_complete.includes('ABCD-EFGH'));
    assert.equal(result.interval, 5);
    assert.equal(result.expires_in, 300);
  } finally { restore(); }
});

// 2. authorizeDevice: HTTP non-200
await test('authorizeDevice: HTTP 503 → throws error', async () => {
  const restore = mockFetch(async () => new Response('Service Unavailable', { status: 503 }));
  try {
    await assert.rejects(
      () => authorizeDevice(HOST),
      (err: Error) => {
        assert.ok(err.message.includes('503'), `expected to include 503, actual: ${err.message}`);
        return true;
      },
    );
  } finally { restore(); }
});

// 3. pollDeviceToken: approved (200 + tokens)
await test('pollDeviceToken: 200 → {status:"approved", tokens}', async () => {
  const restore = mockFetch(async () =>
    new Response(JSON.stringify(MOCK_TOKEN_RESP), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  try {
    const result = await pollDeviceToken(HOST, 'dc-test');
    assert.equal(result.status, 'approved');
    if (result.status === 'approved') {
      assert.equal(result.tokens.access_token, 'access-xyz');
      assert.equal(result.tokens.refresh_token, 'refresh-xyz');
    }
  } finally { restore(); }
});

// 4. pollDeviceToken: authorization_pending
await test('pollDeviceToken: authorization_pending → {status:"pending"}', async () => {
  const restore = mockFetch(async () =>
    new Response(JSON.stringify({ error: 'authorization_pending' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  try {
    const result = await pollDeviceToken(HOST, 'dc-test');
    assert.equal(result.status, 'pending');
  } finally { restore(); }
});

// 5. pollDeviceToken: slow_down
await test('pollDeviceToken: slow_down → {status:"slow_down"}', async () => {
  const restore = mockFetch(async () =>
    new Response(JSON.stringify({ error: 'slow_down' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  try {
    const result = await pollDeviceToken(HOST, 'dc-test');
    assert.equal(result.status, 'slow_down');
  } finally { restore(); }
});

// 6. pollDeviceToken: expired_token
await test('pollDeviceToken: expired_token → {status:"expired"}', async () => {
  const restore = mockFetch(async () =>
    new Response(JSON.stringify({ error: 'expired_token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  try {
    const result = await pollDeviceToken(HOST, 'dc-test');
    assert.equal(result.status, 'expired');
  } finally { restore(); }
});

// 7. pollDeviceToken: network error
await test('pollDeviceToken: network error → {status:"error"}', async () => {
  const restore = mockFetch(async () => { throw new Error('ECONNREFUSED'); });
  try {
    const result = await pollDeviceToken(HOST, 'dc-test');
    assert.equal(result.status, 'error');
    if (result.status === 'error') {
      assert.ok(result.message.includes('ECONNREFUSED'), `expected to include ECONNREFUSED, actual: ${result.message}`);
    }
  } finally { restore(); }
});

// 8. runDeviceFlow: pending → approved → returns tokens (state machine)
await test('runDeviceFlow: pending → approved state machine, returns tokens', async () => {
  let callCount = 0;
  const restore = mockFetch(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/authorize')) {
      // return expires_in=30 to avoid timeout, interval=0 to speed up polling
      return new Response(
        JSON.stringify({ ...MOCK_AUTH_RESP, expires_in: 30, interval: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    // /token endpoint: first 2 calls pending, 3rd call approved
    callCount++;
    if (callCount < 3) {
      return new Response(
        JSON.stringify({ error: 'authorization_pending' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify(MOCK_TOKEN_RESP),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const msgs: string[] = [];
    const tokens = await runDeviceFlow(HOST, { noBrowser: true }, (m) => msgs.push(m));
    assert.equal(tokens.access_token, 'access-xyz');
    assert.equal(tokens.refresh_token, 'refresh-xyz');
    assert.equal(callCount, 3, `expected 3 poll calls, actual: ${callCount}`);
    const joined = msgs.join('\n');
    assert.ok(joined.includes('ABCD-EFGH'), 'should print user_code');
    assert.ok(joined.includes(HOST), 'should print verification URL');
  } finally { restore(); }
});

// 9. runDeviceFlow: slow_down → interval increases
await test('runDeviceFlow: slow_down increases interval by 5s', async () => {
  let callCount = 0;
  const sleepDurations: number[] = [];

  // intercept setTimeout to capture sleep durations
  const origSetTimeout = globalThis.setTimeout;
  (globalThis as any).setTimeout = (fn: () => void, ms: number) => {
    if (ms > 0) sleepDurations.push(ms);
    return origSetTimeout(fn, 0); // execute immediately to avoid real waits
  };

  const restore = mockFetch(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/authorize')) {
      return new Response(
        JSON.stringify({ ...MOCK_AUTH_RESP, expires_in: 60, interval: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    callCount++;
    if (callCount === 1) {
      // first call: slow_down
      return new Response(
        JSON.stringify({ error: 'slow_down' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    // second call: approved
    return new Response(
      JSON.stringify(MOCK_TOKEN_RESP),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    await runDeviceFlow(HOST, { noBrowser: true });
    // first sleep=1000 (interval=1s), after slow_down interval+=5000
    // second sleep=6000
    assert.ok(
      sleepDurations.length >= 2,
      `expected at least 2 sleeps, actual ${sleepDurations.length}: [${sleepDurations.join(',')}]`,
    );
    assert.ok(
      sleepDurations[0] === 1000,
      `first sleep should be 1000ms, actual: ${sleepDurations[0]}`,
    );
    assert.ok(
      sleepDurations[1] === 6000,
      `sleep after slow_down should increase to 6000ms, actual: ${sleepDurations[1]}`,
    );
  } finally {
    restore();
    (globalThis as any).setTimeout = origSetTimeout;
  }
});

// 10. runDeviceFlow: expired_token → throws
await test('runDeviceFlow: expired_token → throws "expired" error', async () => {
  const restore = mockFetch(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/authorize')) {
      return new Response(
        JSON.stringify({ ...MOCK_AUTH_RESP, expires_in: 60, interval: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify({ error: 'expired_token' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => runDeviceFlow(HOST, { noBrowser: true }),
      (err: Error) => {
        assert.ok(
          err.message.includes('expired'),
          `expected to include "expired", actual: ${err.message}`,
        );
        return true;
      },
    );
  } finally { restore(); }
});

// 11. openBrowser: execFileSync throws → returns false, does not throw (I5: genuine catch-branch test)
await test('openBrowser: execFileSync throws → returns false, does not throw', () => {
  // I5: inject a mock execFileSync that always throws — exercises the catch branch directly
  const mockExec = () => { throw new Error('spawn ENOENT'); };
  const result = openBrowser('https://example.com', mockExec as any);
  assert.equal(result, false, 'openBrowser should return false when execFileSync throws');
});

// 12. runDeviceFlow: --no-browser skips open call
await test('runDeviceFlow: noBrowser=true skips browser open', async () => {
  // monitor fetch sequence; with noBrowser=true the flow should still complete normally
  const restore = mockFetch(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/authorize')) {
      return new Response(
        JSON.stringify({ ...MOCK_AUTH_RESP, expires_in: 30, interval: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify(MOCK_TOKEN_RESP),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const msgs: string[] = [];
    const tokens = await runDeviceFlow(HOST, { noBrowser: true }, (m) => msgs.push(m));
    assert.equal(tokens.access_token, 'access-xyz');
    // noBrowser=true → should not have "already tried in browser" message
    const hasBrowserMsg = msgs.some(m => m.includes('Attempted to open'));
    assert.equal(hasBrowserMsg, false, 'should not have "already tried in browser" message');
    // but should print URL
    const hasUrl = msgs.some(m => m.includes(HOST));
    assert.ok(hasUrl, 'should print verification URL');
  } finally { restore(); }
});

// 13. openBrowser: non-http/https protocol → returns false (C1 URL guard)
await test('openBrowser: javascript: protocol → returns false (C1)', () => {
  // C1: malicious/misconfigured server URL with non-http(s) protocol must be rejected
  const result = openBrowser('javascript:alert(1)');
  assert.equal(result, false, 'non-http/https protocol should return false');
});

await test('openBrowser: file: protocol → returns false (C1)', () => {
  const result = openBrowser('file:///etc/passwd');
  assert.equal(result, false, 'file: protocol should return false');
});

// 14. openBrowser: invalid URL → returns false (C1 URL guard)
await test('openBrowser: invalid URL → returns false (C1)', () => {
  const result = openBrowser('not-a-url-at-all');
  assert.equal(result, false, 'invalid URL should return false');
});

// 15. runDeviceFlow: HTTP 401 → abort immediately (I4)
await test('runDeviceFlow: HTTP 401 → aborts immediately and throws (I4)', async () => {
  let pollCount = 0;
  const restore = mockFetch(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/authorize')) {
      return new Response(
        JSON.stringify({ ...MOCK_AUTH_RESP, expires_in: 60, interval: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    pollCount++;
    // Always return 401
    return new Response('Unauthorized', { status: 401 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => runDeviceFlow(HOST, { noBrowser: true }),
      (err: Error) => {
        assert.ok(
          err.message.includes('401') || err.message.includes('denied') || err.message.includes('abort'),
          `expected to include 401 / authorization denied, actual: ${err.message}`,
        );
        return true;
      },
    );
    // Should have aborted after first 401, not retried many times
    assert.ok(pollCount <= 2, `should abort after first 401, actual poll count: ${pollCount}`);
  } finally { restore(); }
});

// 16. authorizeDevice: 404 (old server without endpoint) → DeviceFlowUnsupportedError
await test('authorizeDevice: 404 → DeviceFlowUnsupportedError (F-012)', async () => {
  const restore = mockFetch(async () =>
    new Response('<!doctype html><html><body>Not Found</body></html>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    }),
  );
  try {
    await assert.rejects(
      () => authorizeDevice(HOST),
      (err: Error) => {
        assert.ok(err instanceof DeviceFlowUnsupportedError, `expected DeviceFlowUnsupportedError, actual: ${err.name}: ${err.message}`);
        return true;
      },
    );
  } finally { restore(); }
});

// 17. authorizeDevice: HTTP 200 but SPA index.html → DeviceFlowUnsupportedError
await test('authorizeDevice: 200 + HTML SPA → DeviceFlowUnsupportedError (F-012)', async () => {
  const restore = mockFetch(async () =>
    new Response('<!DOCTYPE html><html><head><title>AE</title></head></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }),
  );
  try {
    await assert.rejects(
      () => authorizeDevice(HOST),
      (err: Error) => {
        assert.ok(err instanceof DeviceFlowUnsupportedError, `expected DeviceFlowUnsupportedError, actual: ${err.name}: ${err.message}`);
        return true;
      },
    );
  } finally { restore(); }
});

// 18. pollDeviceToken: 404 → {status:'unsupported'}
await test('pollDeviceToken: 404 → {status:"unsupported"} (F-012)', async () => {
  const restore = mockFetch(async () => new Response('Not Found', { status: 404 }));
  try {
    const result = await pollDeviceToken(HOST, 'dc-test');
    assert.equal(result.status, 'unsupported');
  } finally { restore(); }
});

// 19. pollDeviceFlow: split-flow resume polls to approval and returns tokens
await test('pollDeviceFlow: pending → approved returns tokens (split-flow resume)', async () => {
  let callCount = 0;
  const restore = mockFetch(async () => {
    callCount++;
    if (callCount < 2) {
      return new Response(JSON.stringify({ error: 'authorization_pending' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(MOCK_TOKEN_RESP), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    const tokens = await pollDeviceFlow(HOST, 'dc-resume', { intervalMs: 0, expiresIn: 30 });
    assert.equal(tokens.access_token, 'access-xyz');
    assert.equal(callCount, 2, `expected 2 poll calls, actual: ${callCount}`);
  } finally { restore(); }
});

// 20. pollDeviceFlow: 404 during poll → DeviceFlowUnsupportedError, aborts fast (no retry-to-timeout)
await test('pollDeviceFlow: 404 during poll → DeviceFlowUnsupportedError (F-012)', async () => {
  let callCount = 0;
  const restore = mockFetch(async () => { callCount++; return new Response('Not Found', { status: 404 }); }) as typeof fetch;
  try {
    await assert.rejects(
      () => pollDeviceFlow(HOST, 'dc-x', { intervalMs: 0, expiresIn: 30 }),
      (err: Error) => {
        assert.ok(err instanceof DeviceFlowUnsupportedError, `expected DeviceFlowUnsupportedError, actual: ${err.name}: ${err.message}`);
        return true;
      },
    );
    assert.ok(callCount <= 2, `should abort fast on 404, actual poll count: ${callCount}`);
  } finally { restore(); }
});

// 21. buildVerificationUrl: builds device-activate URL with encoded user_code
await test('buildVerificationUrl: builds device-activate URL', () => {
  const url = buildVerificationUrl(HOST + '/', 'ABCD-EFGH');
  assert.equal(url, `${HOST}/device-activate?user_code=ABCD-EFGH`);
});

// ── summary ───────────────────────────────────────────────────────────────────

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
