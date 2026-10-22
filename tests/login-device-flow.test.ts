import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorizeLoginDevice, resolveDeviceSessionRoute } from '../src/core/login-device-flow.ts';
import { buildVerificationUrl, pollDeviceToken } from '../src/core/device-auth.ts';
import { PermissionError } from '../src/core/errors.ts';

const host = 'https://platform.example.test';
const authorization = {
  device_code: 'uba_random-session', user_code: 'ABCD-EFGH', expires_in: 300, interval: 5,
  verification_uri: 'https://untrusted.test/activate',
  verification_uri_complete: 'https://untrusted.test/activate?user_code=ABCD-EFGH',
};

test('new login always uses UBA, ignores server verification URLs and pins split-flow routing', async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(authorization));
  };
  try {
    const session = await authorizeLoginDevice(host);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${host}/v1/ta/cli/auth/device/authorize`);
    assert.equal(calls[0].init?.method, 'POST');
    assert.equal(calls[0].init?.redirect, 'error');
    assert.equal(new Headers(calls[0].init?.headers).get('Authorization'), null);
    assert.deepEqual(resolveDeviceSessionRoute(host, authorization.device_code), { baseUrl: host, protocol: 'uba' });
    assert.equal(buildVerificationUrl(session.baseUrl, 'A+B &?', session.protocol),
      `${host}/#/cli/device-activate?user_code=A%2BB%20%26%3F`);
  } finally { globalThis.fetch = original; }
});

test('only an explicit missing UBA endpoint falls back to the published legacy protocol', async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return calls.length === 1
      ? new Response('missing', { status: 404 })
      : new Response(JSON.stringify({ ...authorization, device_code: 'legacy-session' }));
  };
  try {
    const session = await authorizeLoginDevice(host);
    assert.equal(session.protocol, 'legacy');
    assert.deepEqual(calls, [`${host}/v1/ta/cli/auth/device/authorize`, `${host}/agent/api/auth/device/authorize`]);
    assert.equal(buildVerificationUrl(session.baseUrl, authorization.user_code, session.protocol),
      `${host}/agent/device-activate?user_code=ABCD-EFGH`);
    assert.deepEqual(resolveDeviceSessionRoute(host, 'legacy-session'), { baseUrl: `${host}/agent`, protocol: 'legacy' });
  } finally { globalThis.fetch = original; }
});

for (const failure of [403, 500, 502, 200, 'network', 'invalid-prefix'] as const) {
  test(`UBA authorization ${failure} never changes issuer`, async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (failure === 'network') throw new Error('network');
      if (failure === 'invalid-prefix') return new Response(JSON.stringify({ ...authorization, device_code: 'legacy' }));
      return new Response('<!doctype html><html>proxy</html>', { status: failure, headers: { 'Content-Type': 'text/html' } });
    };
    try {
      await assert.rejects(authorizeLoginDevice(host));
      assert.equal(calls, 1);
    } finally { globalThis.fetch = original; }
  });
}

test('UBA poll uses the pinned endpoint and maps a user denial without minting or switching', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), `${host}/v1/ta/cli/auth/device/token`);
    assert.deepEqual(JSON.parse(String(init?.body)), { device_code: 'uba_random-session' });
    assert.equal(init?.redirect, 'error');
    return new Response(JSON.stringify({ error: 'access_denied' }), { status: 400 });
  };
  try {
    const result = await pollDeviceToken(host, 'uba_random-session', 'uba');
    assert.equal(result.status, 'denied');
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('UBA poll 404 is terminal for its session and does not fall back to Agent', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('missing', { status: 404 }); };
  try {
    assert.deepEqual(await pollDeviceToken(host, 'uba_random-session', 'uba'), { status: 'unsupported' });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

for (const limits of [
  { interval: 0 }, { interval: -1 }, { interval: 0.1 }, { interval: '5' },
  { interval: 301 }, { expires_in: 0 }, { expires_in: '300' },
  { expires_in: 301 }, { expires_in: null }, { interval: null },
]) {
  test(`UBA authorization rejects invalid limits ${JSON.stringify(limits)} without changing issuer`, async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ ...authorization, ...limits }));
    };
    try {
      await assert.rejects(authorizeLoginDevice(host), /invalid polling limits/);
      assert.equal(calls, 1);
    } finally { globalThis.fetch = original; }
  });
}

test('UBA 403 uses stable local denial text and never echoes an arbitrary server description', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: 'access_denied', error_description: 'untrusted-secret-must-not-echo',
  }), { status: 403 });
  try {
    const result = await pollDeviceToken(host, authorization.device_code, 'uba');
    assert.equal(result.status, 'denied');
    if (result.status === 'denied') assert.equal(result.code, 'AUTHORIZATION_DENIED');
    assert.doesNotMatch(JSON.stringify(result), /untrusted-secret|access_denied|CLI_ACCESS_DISABLED/);
    await assert.rejects(authorizeLoginDevice(host), (error: unknown) => error instanceof PermissionError
      && error.code === 'AUTHORIZATION_DENIED' && !error.message.includes('untrusted-secret'));
  } finally { globalThis.fetch = original; }
});

for (const code of ['CLI_ACCESS_DISABLED', 'ACCOUNT_UNAVAILABLE', 'ORIGIN_DENIED']) {
  test(`UBA 403 preserves ${code} with safe local English guidance`, async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({
      error: 'access_denied', code, error_description: 'untrusted-secret-must-not-echo',
    }), { status: 403 });
    try {
      const result = await pollDeviceToken(host, authorization.device_code, 'uba');
      assert.equal(result.status, 'denied');
      if (result.status === 'denied') {
        assert.equal(result.code, code);
        assert.ok(result.hint);
        assert.doesNotMatch(result.message, /access_denied/);
      }
      assert.doesNotMatch(JSON.stringify(result), /untrusted-secret/);
      await assert.rejects(authorizeLoginDevice(host), (error: unknown) => error instanceof PermissionError
        && error.code === code && !error.message.includes('untrusted-secret'));
    } finally { globalThis.fetch = original; }
  });
}
