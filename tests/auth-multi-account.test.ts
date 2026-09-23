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

async function runCli(home: string, args: string[], stdin?: string) {
  return await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
      cwd: process.cwd(),
      env: childEnv(home),
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
    if (stdin !== undefined) child.stdin.end(stdin);
  });
}

function activeCredential(home: string, host: string): any {
  const script = `
    import { getActiveCredential } from './src/core/secure-store.ts';
    process.stdout.write(JSON.stringify(getActiveCredential(${JSON.stringify(host)})));
  `;
  return JSON.parse(execFileSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', script],
    { cwd: process.cwd(), env: childEnv(home), encoding: 'utf8' },
  ));
}

function parseOutput(stdout: string): any {
  return JSON.parse(stdout.trim());
}

const alice = { openId: 'open-a', loginName: 'alice', userName: 'Alice' };
const bob = { openId: 'open-b', loginName: 'bob', userName: 'Bob' };

process.stdout.write('\nauth multi-account command tests\n');

await test('unreadable credentials have a distinct error across commands and block authorization before any request', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-unreadable-'));
  let requests = 0;
  const server = http.createServer((_request, response) => {
    requests += 1;
    response.statusCode = 500;
    response.end('Credential preflight should have stopped this request');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    seed(home, host, [{ token: 'cli_preserved', account: alice }]);
    const directory = path.join(home, '.ae-cli', 'secure-tokens');
    const legacy = fs.readdirSync(directory).find(name => !name.includes('.accounts.'))!;
    fs.writeFileSync(path.join(directory, legacy), '{"cliToken":"must-not-leak"');
    const snapshot = () => Object.fromEntries(fs.readdirSync(directory).sort()
      .map(name => [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
    const original = snapshot();
    for (const args of [
      ['auth', 'status'], ['auth', 'list'], ['auth', 'use', '--account', 'alice'],
      ['auth', 'logout'], ['auth', 'login', '--no-browser', '--no-wait'],
      ['auth', 'login', '--device-code', 'fixture-code'], ['auth', 'set-token', '--token-stdin'],
      ['capability', 'search', 'fixture', '--domain', 'analysis'],
    ]) {
      const result = await runCli(home, [...args, '--host', host], 'cli_not_saved\n');
      assert.equal(result.code, 1, `${args.join(' ')}: ${result.stderr}`);
      assert.match(result.stderr.trim(), /^\{/, `${args.join(' ')}: ${result.stderr}`);
      const output = JSON.parse(result.stderr.trim());
      assert.equal(output.error.type, 'config', args.join(' '));
      assert.equal(output.error.code, 'CREDENTIAL_STORE_UNREADABLE', args.join(' '));
      assert.doesNotMatch(output.error.hint, /Run: ae-cli auth login/);
      assert.doesNotMatch(result.stdout + result.stderr, /cli_preserved|must-not-leak|cli_not_saved/);
      assert.deepEqual(snapshot(), original);
    }
    assert.equal(requests, 0);
    const help = await runCli(home, ['auth', '--help']);
    assert.equal(help.code, 0, help.stderr);
    const logs = fs.readdirSync(path.join(home, '.ae-cli', 'log'))
      .map(name => fs.readFileSync(path.join(home, '.ae-cli', 'log', name), 'utf8')).join('\n');
    assert.doesNotMatch(logs, /cli_preserved|must-not-leak|cli_not_saved/);
  } finally {
    server.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('best-effort version probes skip unreadable credentials while authenticated calls reject them', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-probe-'));
  const host = 'https://credential-probe.invalid';
  try {
    seed(home, host, [{ token: 'cli_probe', account: alice }]);
    const directory = path.join(home, '.ae-cli', 'secure-tokens');
    const legacy = fs.readdirSync(directory).find(name => !name.includes('.accounts.'))!;
    fs.writeFileSync(path.join(directory, legacy), 'unreadable');
    execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { peekCliToken, getCliToken } from './src/core/cli-token.ts';
      import { persistDeviceTokens, persistManualCliToken } from './src/commands/auth.ts';
      const host = ${JSON.stringify(host)};
      globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
      assert.equal(peekCliToken(host), undefined);
      const unreadable = error => error.code === 'CREDENTIAL_STORE_UNREADABLE';
      await assert.rejects(() => getCliToken(host), unreadable);
      await assert.rejects(() => persistManualCliToken(host, 'cli_new'), unreadable);
      await assert.rejects(() => persistDeviceTokens(host, { access_token: 'fake-access' }), unreadable);
    `], { cwd: process.cwd(), env: childEnv(home), stdio: 'pipe' });
    try {
      execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
        import { runCommand } from './src/framework/runner.ts';
        import { getCliToken } from './src/core/cli-token.ts';
        await runCommand({
          service: 'fixture', command: 'read', flags: [], risk: 'read',
          execute: async () => getCliToken(${JSON.stringify(host)}),
        }, {}, { format: 'json' });
      `], { cwd: process.cwd(), env: childEnv(home), stdio: 'pipe' });
      assert.fail('A curated command must reject unreadable credentials');
    } catch (error: any) {
      assert.equal(error.status, 1);
      const output = JSON.parse(error.stderr.toString());
      assert.equal(output.error.type, 'config');
      assert.equal(output.error.code, 'CREDENTIAL_STORE_UNREADABLE');
    }
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

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
    const setTokenHelp = await runCli(home, ['auth', 'set-token', '--help']);
    assert.equal(authHelp.code, 0, authHelp.stderr);
    assert.equal(setTokenHelp.code, 0, setTokenHelp.stderr);
    assert.match(authHelp.stdout, /\blist \[options\]/);
    assert.match(authHelp.stdout, /\buse \[options\]/);
    assert.match(authHelp.stdout, /\bset-token \[options\]/);
    assert.match(loginHelp.stdout, /--add/);
    assert.match(setTokenHelp.stdout, /--token-stdin/);
    assert.match(setTokenHelp.stdout, /--add/);
    assert.doesNotMatch(setTokenHelp.stdout, /--token\s+<|set-token\s+<token>/);
    assert.match(authHelp.stdout, /switch the active account interactively/i);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth set-token reads stdin, validates, stores metadata, and never prints the token', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-set-token-'));
  const cliToken = 'cli_manual_secret';
  const expiresAt = '2026-10-04T08:00:00.000Z';
  let validationCalls = 0;
  const server = http.createServer((request, response) => {
    validationCalls += 1;
    assert.equal(request.method, 'GET');
    assert.equal(request.url, '/v1/ta/cli/token/validate');
    assert.equal(request.headers['cli-token'], cliToken);
    assert.equal(request.headers.authorization, undefined);
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      return_code: 0,
      data: {
        openId: alice.openId,
        loginName: alice.loginName,
        userName: alice.userName,
        expiresAt,
      },
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    const result = await runCli(home, ['auth', 'set-token', '--host', host, '--token-stdin'], `${cliToken}\n`);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(validationCalls, 1);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(cliToken));
    const output = parseOutput(result.stdout);
    assert.equal(output.data.authenticated, true);
    assert.equal(output.data.host, host);
    assert.equal(output.data.source, 'manual-cli-token');
    assert.equal(output.data.account.login_name, alice.loginName);
    assert.equal(output.data.cli_token.status, 'valid');
    assert.equal(output.data.cli_token.expires_at, expiresAt);
    const stored = activeCredential(home, host);
    assert.equal(stored.cliToken, cliToken);
    assert.equal(stored.account.loginName, alice.loginName);
    assert.equal(stored.cliTokenExpiresAt, expiresAt);

    const list = await runCli(home, ['auth', 'list']);
    assert.equal(list.code, 0, list.stderr);
    assert.equal(parseOutput(list.stdout).data.host, host);
  } finally {
    server.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth set-token requires --token-stdin outside a TTY', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-set-token-no-tty-'));
  try {
    const result = await runCli(home, ['auth', 'set-token', '--host', 'https://set-token.internal']);
    assert.notEqual(result.code, 0);
    const output = parseOutput(result.stderr);
    assert.equal(output.error.type, 'validation');
    assert.match(output.error.message, /requires a TTY/i);
    assert.match(output.error.message, /--token-stdin/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth set-token rejects a non-CLI token without calling the server', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-set-token-format-'));
  try {
    const result = await runCli(
      home,
      ['auth', 'set-token', '--host', 'https://set-token.internal', '--token-stdin'],
      'not-a-cli-token\n',
    );
    assert.notEqual(result.code, 0);
    const output = parseOutput(result.stderr);
    assert.equal(output.error.type, 'validation');
    assert.match(output.error.hint, /must start with cli_/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /not-a-cli-token/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth set-token keeps the previous credential when validation fails', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-set-token-invalid-'));
  const previousToken = 'cli_previous';
  const rejectedToken = 'cli_rejected';
  const server = http.createServer((_request, response) => {
    response.statusCode = 403;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      return_code: -1,
      code: 'CLI_TOKEN_INVALID',
      return_message: 'CLI token expired',
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    seed(home, host, [{ token: previousToken, account: alice }]);
    const result = await runCli(home, ['auth', 'set-token', '--host', host, '--token-stdin'], rejectedToken);
    assert.notEqual(result.code, 0);
    assert.equal(parseOutput(result.stderr).error.type, 'auth');
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(rejectedToken));
    assert.equal(activeCredential(home, host).cliToken, previousToken);
  } finally {
    server.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth set-token reports disabled CLI access as permission and stores nothing', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-set-token-disabled-'));
  const server = http.createServer((_request, response) => {
    response.statusCode = 403;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      return_code: -2005,
      code: 'CLI_ACCESS_DISABLED',
      return_message: 'CLI_ACCESS_DISABLED: CLI access is disabled for your account.',
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    const result = await runCli(home, ['auth', 'set-token', '--host', host, '--token-stdin'], 'cli_disabled');
    assert.notEqual(result.code, 0);
    const output = parseOutput(result.stderr);
    assert.equal(output.error.type, 'permission');
    assert.equal(output.error.code, 'CLI_ACCESS_DISABLED');
    assert.equal(activeCredential(home, host), null);
  } finally {
    server.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth set-token --add preserves another account and activates the imported account', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-auth-set-token-add-'));
  const server = http.createServer((_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      return_code: 0,
      data: { openId: bob.openId, loginName: bob.loginName, userName: bob.userName },
    }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  try {
    seed(home, host, [{ token: 'cli_alice', account: alice }]);
    const result = await runCli(
      home,
      ['auth', 'set-token', '--host', host, '--token-stdin', '--add'],
      'cli_bob\n',
    );
    assert.equal(result.code, 0, result.stderr);
    const list = await runCli(home, ['auth', 'list', '--host', host]);
    const accounts = parseOutput(list.stdout).data.accounts;
    assert.equal(accounts.length, 2);
    assert.deepEqual(accounts.map((item: any) => item.account.login_name).sort(), ['alice', 'bob']);
    assert.equal(accounts.find((item: any) => item.active).account.login_name, 'bob');
  } finally {
    server.close();
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
