/** Black-box auth command tests in isolated HOME directories. */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { getConfigDir } from '../src/core/config.ts';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`  ✗ ${name}\n    ${error instanceof Error ? error.stack : String(error)}\n`);
  }
}

function childEnv(home: string): NodeJS.ProcessEnv {
  return { ...process.env, HOME: home, AE_CLI_NO_COMPAT_CHECK: '1', NO_COLOR: '1' };
}

function seed(home: string, host: string, credentials: Array<{ token: string; account?: Record<string, string>; add?: boolean }>) {
  const script = `
    import { saveCredential } from './src/core/secure-store.ts';
    const host = ${JSON.stringify(host)};
    const credentials = ${JSON.stringify(credentials)};
    for (const item of credentials) {
      saveCredential(host, {
        cliToken: item.token,
        ...(item.account ? { account: item.account } : {}),
      }, { add: item.add });
    }
  `;
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: process.cwd(),
    env: childEnv(home),
    stdio: 'pipe',
  });
}

async function runCli(home: string, args: string[]) {
  return await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
      cwd: process.cwd(),
      env: childEnv(home),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

function parseOutput(stdout: string): any {
  return JSON.parse(stdout.trim());
}

const alice = { openId: 'open-a', loginName: 'alice', userName: 'Alice' };
const bob = { openId: 'open-b', loginName: 'bob', userName: 'Bob' };

process.stdout.write('\nauth multi-account command tests\n');

await test('device login persists only CLI token after generate and validate', async () => {
  const host = `https://login-persist-${process.pid}-${Date.now()}.internal`;
  const originalFetch = globalThis.fetch;
  const previousSkip = process.env.AE_CLI_NO_COMPAT_CHECK;
  process.env.AE_CLI_NO_COMPAT_CHECK = '1';
  let calls = 0;
  globalThis.fetch = (async (input, init) => {
    calls += 1;
    const url = String(input);
    if (url.endsWith('/v1/ta/cli/token/generate')) {
      assert.equal((init?.headers as Record<string, string>).Authorization, 'bearer one-time-access-secret');
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'cli_login_result' } }), { status: 200 });
    }
    if (url.endsWith('/v1/ta/cli/token/validate')) {
      assert.equal((init?.headers as Record<string, string>)['cli-token'], 'cli_login_result');
      assert.equal((init?.headers as Record<string, string>).Authorization, undefined);
      return new Response(JSON.stringify({
        return_code: 0,
        data: { openId: 'open-a', loginName: 'alice', userName: 'Alice' },
      }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;
  try {
    const { persistDeviceTokens } = await import('../src/commands/auth.ts');
    const { load, getActiveCredential } = await import('../src/core/secure-store.ts');
    const saved = await persistDeviceTokens(host, {
      access_token: 'one-time-access-secret',
      refresh_token: 'never-persist-refresh-secret',
      token_type: 'bearer',
      expires_in: 72000,
    });
    assert.equal(calls, 2);
    assert.equal(saved.account?.loginName, 'alice');
    assert.equal(getActiveCredential(host)?.cliToken, 'cli_login_result');
    assert.equal(load(host)?.accessToken, '');
    assert.equal(load(host)?.refreshToken, '');
    const storeDir = path.join(getConfigDir(), 'secure-tokens');
    const raw = fs.readdirSync(storeDir)
      .filter((name) => name.includes(`login-persist-${process.pid}`))
      .map((name) => fs.readFileSync(path.join(storeDir, name), 'utf8'))
      .join('\n');
    assert.equal(raw.includes('one-time-access-secret'), false);
    assert.equal(raw.includes('never-persist-refresh-secret'), false);
  } finally {
    const { clearAllCredentials } = await import('../src/core/secure-store.ts');
    clearAllCredentials(host);
    globalThis.fetch = originalFetch;
    if (previousSkip === undefined) delete process.env.AE_CLI_NO_COMPAT_CHECK;
    else process.env.AE_CLI_NO_COMPAT_CHECK = previousSkip;
  }
});

await test('failed login validation preserves the previous account without partial credentials', async () => {
  const host = `https://login-invalid-${process.pid}-${Date.now()}.internal`;
  const originalFetch = globalThis.fetch;
  const previousSkip = process.env.AE_CLI_NO_COMPAT_CHECK;
  process.env.AE_CLI_NO_COMPAT_CHECK = '1';
  const { persistDeviceTokens } = await import('../src/commands/auth.ts');
  const {
    clearAllCredentials,
    getActiveCredential,
    listCredentials,
    saveCredential,
    SecureStoreAuthError,
  } = await import('../src/core/secure-store.ts');
  saveCredential(host, { cliToken: 'cli_previous', account: alice });
  let calls = 0;
  globalThis.fetch = (async (input) => {
    calls++;
    if (String(input).endsWith('/v1/ta/cli/token/generate')) {
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'cli_rejected' } }), { status: 200 });
    }
    return new Response(JSON.stringify({
      return_code: -1,
      code: 'CLI_TOKEN_INVALID',
      return_message: 'CLI token expired',
    }), { status: 403 });
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => persistDeviceTokens(host, {
        access_token: 'one-time-access-secret',
        token_type: 'bearer',
        expires_in: 72000,
      }, { add: true }),
      SecureStoreAuthError,
    );
    assert.equal(calls, 2);
    assert.equal(getActiveCredential(host)?.cliToken, 'cli_previous');
    assert.deepEqual(listCredentials(host).map((entry) => entry.cliToken), ['cli_previous']);
  } finally {
    clearAllCredentials(host);
    globalThis.fetch = originalFetch;
    if (previousSkip === undefined) delete process.env.AE_CLI_NO_COMPAT_CHECK;
    else process.env.AE_CLI_NO_COMPAT_CHECK = previousSkip;
  }
});

await test('auth help exposes lightweight multi-account commands and login --add', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-help-'));
  try {
    const authHelp = await runCli(home, ['auth', '--help']);
    const loginHelp = await runCli(home, ['auth', 'login', '--help']);
    assert.equal(authHelp.code, 0, authHelp.stderr);
    assert.match(authHelp.stdout, /\blist \[options\]/);
    assert.match(authHelp.stdout, /\buse \[options\]/);
    assert.match(loginHelp.stdout, /--add/);
    assert.match(authHelp.stdout, /switch the active account interactively/i);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('interactive auth entry points require a TTY when no account is provided', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-interactive-no-tty-'));
  const host = 'https://multi-interactive.internal';
  try {
    seed(home, host, [
      { token: 'cli_alice', account: alice },
      { token: 'cli_bob', account: bob, add: true },
    ]);
    const rootResult = await runCli(home, ['--host', host, 'auth']);
    assert.equal(rootResult.code, 1);
    assert.match(rootResult.stderr, /Interactive account selection requires a TTY/);
    assert.match(rootResult.stderr, /auth use .* --account/);

    const useResult = await runCli(home, ['auth', 'use', '--host', host]);
    assert.equal(useResult.code, 1);
    assert.match(useResult.stderr, /Interactive account selection requires a TTY/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('interactive account choices put the active account first and use open_id values', async () => {
  const { buildAccountSelectionItems } = await import('../src/commands/auth.ts');
  const choices = buildAccountSelectionItems([
    { id: 'cred-a', cliToken: 'cli_alice', account: alice },
    { id: 'cred-b', cliToken: 'cli_bob', account: bob },
    { id: 'legacy', cliToken: 'cli_legacy' },
  ], 'cred-b');
  assert.deepEqual(choices.map((choice) => choice.value), ['open-b', 'open-a']);
  assert.match(choices[0].label, /bob.*\[active\]/);
  assert.equal(choices.some((choice) => choice.label.includes('cli_legacy')), false);
});

await test('auth list returns two accounts, exactly one active, and never exposes tokens', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-list-'));
  const host = 'https://multi-list.internal';
  try {
    seed(home, host, [
      { token: 'cli_alice_secret', account: alice },
      { token: 'cli_bob_secret', account: bob, add: true },
    ]);
    const result = await runCli(home, ['auth', 'list', '--host', host]);
    assert.equal(result.code, 0, result.stderr);
    const output = parseOutput(result.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.data.accounts.length, 2);
    assert.equal(output.data.accounts.filter((item: any) => item.active).length, 1);
    assert.equal(output.data.accounts.find((item: any) => item.active).account.login_name, 'bob');
    assert.equal(result.stdout.includes('cli_alice_secret'), false);
    assert.equal(result.stdout.includes('cli_bob_secret'), false);
    assert.equal(/access[_A-Z]?token/i.test(result.stdout), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth use changes the active account and the following auth list reflects it', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-use-'));
  const host = 'https://multi-use.internal';
  try {
    seed(home, host, [
      { token: 'cli_alice', account: alice },
      { token: 'cli_bob', account: bob, add: true },
    ]);
    const useResult = await runCli(home, ['auth', 'use', '--host', host, '--account', 'alice']);
    assert.equal(useResult.code, 0, useResult.stderr);
    assert.equal(parseOutput(useResult.stdout).data.account.login_name, 'alice');
    const listResult = await runCli(home, ['auth', 'list', '--host', host]);
    const active = parseOutput(listResult.stdout).data.accounts.find((item: any) => item.active);
    assert.equal(active.account.open_id, 'open-a');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth logout removes only active account, then --all removes the remainder', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-logout-'));
  const host = 'https://multi-logout.internal';
  try {
    seed(home, host, [
      { token: 'cli_alice', account: alice },
      { token: 'cli_bob', account: bob, add: true },
    ]);
    const one = await runCli(home, ['auth', 'logout', '--host', host]);
    assert.equal(one.code, 0, one.stderr);
    assert.equal(parseOutput(one.stdout).data.remaining_accounts, 1);
    const list = await runCli(home, ['auth', 'list', '--host', host]);
    assert.equal(parseOutput(list.stdout).data.accounts[0].account.login_name, 'alice');
    const all = await runCli(home, ['auth', 'logout', '--host', host, '--all']);
    assert.equal(all.code, 0, all.stderr);
    const empty = await runCli(home, ['auth', 'list', '--host', host]);
    assert.deepEqual(parseOutput(empty.stdout).data.accounts, []);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth status shows CLI token metadata and account from the new validate response', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-status-new-'));
  const server = http.createServer((request, response) => {
    assert.equal(request.url, '/v1/ta/cli/token/validate');
    assert.equal(request.headers['cli-token'], 'cli_status');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      return_code: 0,
      data: { openId: 'open-a', loginName: 'alice', userName: 'Alice', expiresAt: 1789776000000 },
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    seed(home, host, [{ token: 'cli_status' }]);
    const result = await runCli(home, ['auth', 'status', '--host', host]);
    assert.equal(result.code, 0, result.stderr);
    const output = parseOutput(result.stdout);
    assert.equal(output.data.authenticated, true);
    assert.equal(output.data.cli_token.status, 'valid');
    assert.equal(output.data.cli_token.expires_at, new Date(1789776000000).toISOString());
    assert.equal(output.data.account.login_name, 'alice');
    assert.equal(/access[_A-Z]?token/i.test(result.stdout), false);
  } finally {
    server.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth status trusts a stored token on old-server 404 and omits account entirely', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-status-old-'));
  const server = http.createServer((_request, response) => {
    response.statusCode = 404;
    response.end('Not Found');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    seed(home, host, [{ token: 'cli_old_backend' }]);
    const result = await runCli(home, ['auth', 'status', '--host', host]);
    assert.equal(result.code, 0, result.stderr);
    const output = parseOutput(result.stdout);
    assert.equal(output.data.authenticated, true);
    assert.equal(output.data.cli_token.status, 'trusted');
    assert.equal(Object.hasOwn(output.data, 'account'), false);
    assert.equal(result.stdout.includes('null'), false);
  } finally {
    server.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
