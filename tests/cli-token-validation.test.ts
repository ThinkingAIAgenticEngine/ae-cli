import assert from 'node:assert/strict';

const {
  CliTokenValidationUnavailableError,
  validateCliTokenOnServer,
} = await import('../src/core/cli-token.ts');
const { SecureStoreAuthError } = await import('../src/core/secure-store.ts');
const { fetchCliConfig } = await import('../src/core/compat-check.ts');

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

process.stdout.write('\ncli-token validation tests\n');

await test('validates a CLI token without exposing it in the URL', async () => {
  const host = 'https://test-cli-validation.internal';

  const originalFetch = globalThis.fetch;
  let validationCalls = 0;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    assert.equal(url, `${host}/v1/ta/cli/token/validate`);
    assert.equal(init?.method, 'GET');
    assert.equal((init?.headers as Record<string, string>)['cli-token'], 'cli_valid_token');
    assert.ok(!url.includes('cli_valid_token'), 'the credential must not appear in the URL');
    validationCalls += 1;
    return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await validateCliTokenOnServer(host, 'cli_valid_token');
    assert.deepEqual(result, {});
    assert.equal(validationCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('reads account and expiration from a new camelCase backend response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    return_code: 0,
    data: {
      openId: 'open-1',
      loginName: 'alice',
      userName: 'Alice',
      expiresAt: 1789776000000,
    },
  }), { status: 200 })) as typeof fetch;
  try {
    const result = await validateCliTokenOnServer('https://new-backend.internal', 'cli_valid_token');
    assert.deepEqual(result.account, { openId: 'open-1', loginName: 'alice', userName: 'Alice' });
    assert.equal(result.cliTokenExpiresAt, new Date(1789776000000).toISOString());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('also accepts snake_case account fields and ISO expiration', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    return_code: 0,
    data: {
      open_id: 'open-2',
      login_name: 'bob',
      user_name: 'Bob',
      expires_at: '2026-09-20T00:00:00.000Z',
    },
  }), { status: 200 })) as typeof fetch;
  try {
    const result = await validateCliTokenOnServer('https://snake-backend.internal', 'cli_valid_token');
    assert.equal(result.account?.loginName, 'bob');
    assert.equal(result.cliTokenExpiresAt, '2026-09-20T00:00:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('omits account when identity fields are incomplete instead of exposing nulls', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    return_code: 0,
    data: { openId: 'open-3', loginName: null, userName: null },
  }), { status: 200 })) as typeof fetch;
  try {
    const result = await validateCliTokenOnServer('https://partial-backend.internal', 'cli_valid_token');
    assert.equal(result.account, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('rejects an invalid or expired CLI token', async () => {
  const host = 'https://test-cli-expired.internal';

  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ return_code: -1001, return_message: 'Invalid cli-token' }), { status: 200 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => validateCliTokenOnServer(host, 'cli_expired_token'),
      (error: unknown) => error instanceof SecureStoreAuthError
        && error.message.includes('invalid or expired')
        && error.message.includes('auth logout')
        && error.message.includes('auth login'),
    );
    assert.equal(calls, 1, 'validation failure must not trigger an automatic mint');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('reports an unavailable validation endpoint separately from an invalid token', async () => {
  const host = 'https://test-cli-validation-unsupported.internal';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('Not Found', {
    status: 404,
    statusText: 'Not Found',
  })) as typeof fetch;

  try {
    await assert.rejects(
      () => validateCliTokenOnServer(host, 'cli_token_for_older_server'),
      (error: unknown) => error instanceof CliTokenValidationUnavailableError
        && error.message.includes('validation is unavailable')
        && error.message.includes('HTTP 404'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('treats an older server access-token error as unsupported validation', async () => {
  const host = 'https://test-cli-validation-old-server.internal';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    return_code: -1001,
    return_message: 'Invalid access token',
  }), { status: 200 })) as typeof fetch;

  try {
    await assert.rejects(
      () => validateCliTokenOnServer(host, 'cli_token_for_older_server'),
      (error: unknown) => error instanceof CliTokenValidationUnavailableError
        && error.message.includes('unsupported response'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('reports network validation failures as unavailable', async () => {
  const host = 'https://test-cli-validation-offline.internal';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('connection refused');
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => validateCliTokenOnServer(host, 'cli_token_for_unreachable_server'),
      (error: unknown) => error instanceof CliTokenValidationUnavailableError
        && error.message.includes('Unable to validate CLI token')
        && error.message.includes('connection refused'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await test('compat-check authenticates with cli-token only and never sends Authorization', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/v1/ta/cli/config');
    assert.equal(url.searchParams.get('cli-token'), 'cli_compat');
    assert.equal((init?.headers as Record<string, string>).Authorization, undefined);
    return new Response(JSON.stringify({
      return_code: 0,
      data: { versions: { clusterVersion: '6.0.0', aeCliVersion: '6.0.47' } },
    }), { status: 200 });
  }) as typeof fetch;
  try {
    assert.deepEqual(await fetchCliConfig('https://compat.internal', 'cli_compat'), {
      clusterVersion: '6.0.0',
      aeCliVersion: '6.0.47',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
