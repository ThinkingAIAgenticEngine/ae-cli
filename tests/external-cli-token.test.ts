import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { ExternalCliTokenError, externalCliTokenRequestOptions, readExternalCliToken, setExternalCliTokenFile } from '../src/core/external-cli-token.ts';

const environmentKeys = ['HOME', 'SANDBOX_RUNTIME_ROOT', 'TE_AGENT_CLI_CONFIG_DIR', 'AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE',
  'TE_CLAUDE_BASE_URL', 'SANDBOX_ID', 'SECRET_KEY', 'SANDBOX_SECRET_KEY'] as const;
const originalEnv = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-external-token-'));
process.env.HOME = path.join(directory, 'home');
process.env.SANDBOX_RUNTIME_ROOT = path.join(directory, 'runtime');

function resetExternal(): void {
  setExternalCliTokenFile(undefined);
  for (const key of ['TE_AGENT_CLI_CONFIG_DIR', 'AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE']) delete process.env[key];
}
resetExternal();

const { getActiveHost } = await import('../src/core/config.ts');
const { getCliToken, peekCliToken, localRenewDate } = await import('../src/core/cli-token.ts');
const { saveCredential, markCredentialRenewed } = await import('../src/core/secure-store.ts');
const { listCapabilities } = await import('../src/core/capability-api.ts');
const { callMcpTool } = await import('../src/core/mcp.ts');
const { kbApi } = await import('../src/core/mcp-access.ts');
const { getFromMainApp } = await import('../src/core/te-agent-client.ts');
const { createRuntimeContext } = await import('../src/framework/runner.ts');
const { logger } = await import('../src/core/logger.ts');
const { formatError } = await import('../src/framework/output.ts');
const originalFetch = globalThis.fetch;
let passed = 0;
let failed = 0;

async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  resetExternal();
  try { await run(); passed += 1; process.stdout.write(`  ✓ ${name}\n`); }
  catch (error) { failed += 1; process.stdout.write(`  ✗ ${name}\n    ${error instanceof Error ? error.stack : String(error)}\n`); }
  finally { resetExternal(); globalThis.fetch = originalFetch; }
}

function setEnvironmentToken(host: string, token = 'cli_external_alice'): void {
  process.env.AE_CLI_TOKEN = token;
  process.env.AE_CLI_TOKEN_HOST = host;
}

function tokenFile(name: string, value: unknown): string {
  const file = path.join(directory, name);
  fs.writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
  return file;
}

function vaultSnapshot(): Record<string, string> {
  const folder = path.join(process.env.HOME!, '.ae-cli', 'secure-tokens');
  return Object.fromEntries(fs.readdirSync(folder).sort().map(file => [file, fs.readFileSync(path.join(folder, file), 'hex')]));
}

async function runCli(args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  return await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
      cwd: process.cwd(), env: { ...process.env, AE_CLI_NO_COMPAT_CHECK: '1', NO_COLOR: '1', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

process.stdout.write('\nexternal CLI token tests\n');
try {
  await test('explicit file, environment token, environment file, stored account precedence is deterministic', () => {
    const host = 'https://external.example.com';
    const first = tokenFile('first.json', { url: host, token: 'cli_file_first' });
    const second = tokenFile('second.json', { url: host, 'cli-token': 'cli_file_second' });
    process.env.AE_CLI_TOKEN_FILE = first;
    assert.equal(readExternalCliToken()?.token, 'cli_file_first');
    setEnvironmentToken(host);
    assert.equal(readExternalCliToken()?.token, 'cli_external_alice');
    setExternalCliTokenFile(second);
    assert.equal(readExternalCliToken()?.token, 'cli_file_second');
    assert.equal(getActiveHost(), host);
    fs.writeFileSync(second, JSON.stringify({ url: host, token: 'cli_rotated' }));
    assert.equal(readExternalCliToken()?.token, 'cli_rotated');
  });

  await test('surrounding whitespace is normalized for environment and file tokens, while internal whitespace is rejected', () => {
    const host = 'https://external.example.com';
    for (const token of [' cli_synthetic ', '\tcli_synthetic\r\n']) {
      setEnvironmentToken(host, token);
      assert.equal(readExternalCliToken()?.token, 'cli_synthetic');
      setExternalCliTokenFile(tokenFile('whitespace.json', { url: host, token }));
      assert.equal(readExternalCliToken()?.token, 'cli_synthetic');
      resetExternal();
    }
    for (const token of ['cli_has space', 'cli_has\ttab', 'cli_has\nnewline', ' \t\r\n']) {
      setEnvironmentToken(host, token);
      assert.throws(() => readExternalCliToken(), ExternalCliTokenError);
      setExternalCliTokenFile(tokenFile('whitespace.json', { url: host, token }));
      assert.throws(() => readExternalCliToken(), ExternalCliTokenError);
      resetExternal();
    }
  });

  await test('empty, malformed, missing, oversized, or host-mismatched explicit credentials fail closed without leaking values', () => {
    const host = 'https://external.example.com';
    for (const value of ['', 'invalid-secret-must-not-leak', 'cli_has whitespace', 'cli_\ud800', 'cli_\u2603']) {
      setEnvironmentToken(host, value);
      assert.throws(() => readExternalCliToken(), error => error instanceof ExternalCliTokenError && !error.message.includes('must-not-leak'));
    }
    resetExternal();
    process.env.AE_CLI_TOKEN_HOST = host;
    assert.throws(() => readExternalCliToken(), ExternalCliTokenError);
    setEnvironmentToken(host);
    delete process.env.AE_CLI_TOKEN_HOST;
    assert.throws(() => readExternalCliToken(), ExternalCliTokenError);
    setEnvironmentToken('https://user:secret@example.com');
    assert.throws(() => readExternalCliToken(), ExternalCliTokenError);
    setEnvironmentToken(host);
    assert.throws(() => readExternalCliToken('https://other.example.com'), ExternalCliTokenError);
    assert.equal(readExternalCliToken(`${host}/`)?.url, host);
    setEnvironmentToken('HTTPS://EXTERNAL.example.com:443/');
    assert.equal(readExternalCliToken(host)?.url, host);
    for (const file of ['', path.join(directory, 'missing.json'), tokenFile('array.json', []), tokenFile('bad.json', {})]) {
      setExternalCliTokenFile(file);
      assert.throws(() => readExternalCliToken(), ExternalCliTokenError);
    }
    const malformed = path.join(directory, 'malformed.json');
    fs.writeFileSync(malformed, '{"token":"cli_secret_must_not_leak"');
    setExternalCliTokenFile(malformed);
    assert.throws(() => readExternalCliToken(), error => error instanceof ExternalCliTokenError && !error.message.includes('cli_secret'));
    fs.writeFileSync(malformed, 'x'.repeat(65537));
    assert.throws(() => readExternalCliToken(), ExternalCliTokenError);
  });

  await test('external identity bypasses the vault and host cache; renewal uses a header and stays in memory per token', async () => {
    const host = 'https://external.example.com';
    saveCredential(host, { cliToken: 'cli_stored_machine_user' });
    markCredentialRenewed(host, 'cli_stored_machine_user', localRenewDate());
    const before = vaultSnapshot();
    const renewTokens: string[] = [];
    globalThis.fetch = (async (input, init) => {
      assert.equal(String(input), `${host}/v1/ta/cli/token/renew`);
      const header = new Headers(init?.headers).get('cli-token');
      assert.ok(header); renewTokens.push(header);
      return new Response(JSON.stringify({ return_code: 0 }));
    }) as typeof fetch;
    setEnvironmentToken(host);
    assert.equal(peekCliToken(), 'cli_external_alice');
    assert.equal(await getCliToken(), 'cli_external_alice');
    assert.equal(await getCliToken(host), 'cli_external_alice');
    setEnvironmentToken(host, 'cli_external_bob');
    assert.equal(await getCliToken(host), 'cli_external_bob');
    assert.deepEqual(renewTokens, ['cli_external_alice', 'cli_external_bob']);
    assert.deepEqual(vaultSnapshot(), before);
    assert.equal(fs.existsSync(path.join(process.env.HOME!, '.ae-cli', 'cli-token-renew.json')), false);
    resetExternal();
    assert.equal(await getCliToken(host), 'cli_stored_machine_user');
    assert.equal(peekCliToken(host), 'cli_stored_machine_user');
  });

  await test('external credentials override an isolated session and removing them restores fail-closed session identity', async () => {
    const host = 'https://session-precedence.example.com';
    const sessionHost = 'https://isolated-session.example.com';
    const sessionDirectory = path.join(directory, 'isolated-session');
    fs.mkdirSync(sessionDirectory, { recursive: true });
    const sessionFile = path.join(sessionDirectory, 'cli-token.json');
    fs.writeFileSync(sessionFile, JSON.stringify({ url: sessionHost, token: 'cli_isolated_session' }));
    saveCredential(sessionHost, { cliToken: 'cli_shared_machine_user' });
    markCredentialRenewed(sessionHost, 'cli_shared_machine_user', localRenewDate());
    assert.equal(await getCliToken(sessionHost), 'cli_shared_machine_user');
    process.env.TE_AGENT_CLI_CONFIG_DIR = sessionDirectory;
    const before = vaultSnapshot();
    const renewTokens: string[] = [];
    globalThis.fetch = (async (input, init) => {
      assert.equal(String(input), `${host}/v1/ta/cli/token/renew`);
      renewTokens.push(new Headers(init?.headers).get('cli-token')!);
      return new Response(JSON.stringify({ return_code: 0 }));
    }) as typeof fetch;
    setEnvironmentToken(host, 'cli_external_session_override');
    assert.equal(getActiveHost(), host);
    assert.equal(peekCliToken(), 'cli_external_session_override');
    assert.equal(await getCliToken(host), 'cli_external_session_override');
    assert.throws(() => peekCliToken(sessionHost), ExternalCliTokenError);
    await assert.rejects(() => getCliToken(sessionHost), ExternalCliTokenError);
    setExternalCliTokenFile(tokenFile('session-override.json', { url: host, token: 'cli_file_session_override' }));
    assert.equal(peekCliToken(host), 'cli_file_session_override');
    assert.equal(await getCliToken(host), 'cli_file_session_override');
    process.env.AE_CLI_TOKEN = '';
    setExternalCliTokenFile(undefined);
    assert.throws(() => peekCliToken(), ExternalCliTokenError);
    await assert.rejects(() => getCliToken(), ExternalCliTokenError);
    delete process.env.AE_CLI_TOKEN;
    delete process.env.AE_CLI_TOKEN_HOST;
    assert.equal(getActiveHost(), sessionHost);
    assert.equal(peekCliToken(sessionHost), 'cli_isolated_session');
    assert.equal(await getCliToken(sessionHost), 'cli_isolated_session');
    assert.equal(peekCliToken(host), undefined);
    await assert.rejects(() => getCliToken(host), /session.*credential/i);
    fs.rmSync(sessionFile);
    assert.equal(peekCliToken(sessionHost), undefined);
    await assert.rejects(() => getCliToken(sessionHost), /session.*credential/i);
    assert.deepEqual(renewTokens, ['cli_external_session_override', 'cli_file_session_override']);
    assert.deepEqual(vaultSnapshot(), before);
  });

  await test('capability, MCP, KB, and Agent transports use the external identity even with sandbox credentials', async () => {
    const host = 'https://transports.example.com';
    setEnvironmentToken(host, 'cli_transport_identity');
    process.env.TE_CLAUDE_BASE_URL = 'https://unrelated-sandbox.example.com/agent';
    process.env.SANDBOX_ID = 'shared-sandbox'; process.env.SECRET_KEY = 'shared-secret';
    const calls: string[] = [];
    globalThis.fetch = (async (input, init) => {
      const url = String(input); const headers = new Headers(init?.headers);
      assert.ok(url.startsWith(host));
      assert.equal(headers.get('X-Sandbox-Id'), null); assert.equal(headers.get('X-Sandbox-Secret-Key'), null);
      assert.equal(headers.get('Authorization'), null); assert.equal(init?.redirect, 'error');
      assert.equal(headers.get('cli-token'), 'cli_transport_identity');
      if (url.endsWith('/token/renew')) return new Response(JSON.stringify({ return_code: 0 }));
      calls.push(url);
      if (url.endsWith('/mcp')) return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: '{}' }] } }));
      return new Response(JSON.stringify({ ok: true, data: [] }));
    }) as typeof fetch;
    await listCapabilities(host, 'analysis');
    await callMcpTool(`${host}/mcp`, 'fixture', {}, host);
    const ctx = createRuntimeContext({ service: 'kb', command: 'fixture', description: 'Fixture', flags: [], risk: 'read', execute: async () => ({}) }, {}, { format: 'json', validate: false, dryRun: false, yes: false });
    await kbApi(ctx, 'GET', '/kb-fixture');
    await getFromMainApp('/agent-fixture');
    const legacyRoutes = ['/api/sandbox/models?current=model-fixture', '/api/sandbox/sync/pull/candidates?workspacePath=%2Ffixture&kind=both'];
    for (const route of legacyRoutes) await getFromMainApp(route);
    await getFromMainApp('/api/sandbox/models', undefined, 'cli-token');
    assert.equal(calls.length, 7);
    assert.equal(calls[3], `${host}/agent/agent-fixture`);
    assert.deepEqual(calls.slice(4), [...legacyRoutes, '/api/sandbox/models'].map(route => `${host}/agent${route}`));
  });

  await test('renewal failure never selects another identity and diagnostics redact the external token', async () => {
    const host = 'https://failed-renew.example.com'; const token = 'cli_secret_do_not_expose';
    setEnvironmentToken(host, token);
    globalThis.fetch = (async () => { throw new Error(`rejected ${token}`); }) as typeof fetch;
    assert.equal(await getCliToken(host), token);
    logger.warn(`diagnostic ${token}`);
    assert.ok(!formatError('auth', `Invalid ${token}`, undefined, undefined, { token }).includes(token));
    const logs = path.join(process.env.HOME!, '.ae-cli', 'log');
    for (const file of fs.readdirSync(logs)) assert.ok(!fs.readFileSync(path.join(logs, file), 'utf8').includes(token));
    resetExternal();
    assert.ok(!formatError('auth', `Earlier request ${token}`).includes(token));
  });

  await test('external credentials cannot follow redirects or use an alternate MCP origin', async () => {
    const host = 'https://bound.example.com';
    setEnvironmentToken(host, 'cli_bound_identity');
    assert.deepEqual(externalCliTokenRequestOptions(`${host}/api/test`), { redirect: 'error' });
    assert.throws(() => externalCliTokenRequestOptions('https://other.example.com/api'), ExternalCliTokenError);
    let requests = 0;
    globalThis.fetch = (async (input, init) => {
      assert.equal(init?.redirect, 'error'); requests += 1;
      return new Response(JSON.stringify({ return_code: 0 }));
    }) as typeof fetch;
    await assert.rejects(() => callMcpTool('https://other.example.com/mcp', 'fixture', {}, host), ExternalCliTokenError);
    assert.equal(requests, 1, 'only the same-host renewal may run before rejecting the business destination');
  });

  await test('authentication and permission rejections never retry using the stored machine identity', async () => {
    const host = 'https://rejections.example.com';
    saveCredential(host, { cliToken: 'cli_machine_rejected' });
    const before = vaultSnapshot();
    setEnvironmentToken(host, 'cli_rejected_external');
    for (const status of [401, 403]) {
      const calls: string[] = [];
      globalThis.fetch = (async (input, init) => {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('cli-token'), 'cli_rejected_external');
        if (String(input).includes('/token/renew')) return new Response(JSON.stringify({ return_code: 0 }));
        calls.push(String(input));
        return new Response(JSON.stringify({ error: { code: status === 401 ? 'UNAUTHORIZED' : 'PERMISSION_DENIED', message: 'Rejected' } }), { status });
      }) as typeof fetch;
      await assert.rejects(() => listCapabilities(host, 'analysis'));
      await assert.rejects(() => callMcpTool(`${host}/mcp`, 'fixture', {}, host));
      const ctx = createRuntimeContext({ service: 'kb', command: 'fixture', description: 'Fixture', flags: [], risk: 'read', execute: async () => ({}) }, {}, { host, format: 'json', validate: false, dryRun: false, yes: false });
      await assert.rejects(() => kbApi(ctx, 'GET', '/kb-fixture'));
      await assert.rejects(() => getFromMainApp('/agent-fixture'));
      assert.equal(calls.length, 4);
      assert.deepEqual(vaultSnapshot(), before);
    }
  });

  await test('status and business requests work with an unreadable vault; account mutations reject without changing it', async () => {
    const requests: string[] = [];
    const requestTokens: string[] = [];
    const server = http.createServer((request, response) => {
      requests.push(request.url!);
      const token = String(request.headers['cli-token']);
      requestTokens.push(token);
      assert.ok(['cli_blackbox_identity', 'cli_blackbox_second_user'].includes(token));
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(request.url?.endsWith('/validate')
        ? { return_code: 0, data: { openId: token === 'cli_blackbox_second_user' ? 'external-second-user' : 'external-user', loginName: 'external-login', userName: 'External', expiresAt: '2027-01-01T00:00:00Z' } }
        : request.url?.includes('/api/cli/') ? { ok: true, data: [] } : { return_code: 0 }));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const host = `http://127.0.0.1:${address.port}`;
    saveCredential(host, { cliToken: 'cli_machine_account' });
    const folder = path.join(process.env.HOME!, '.ae-cli', 'secure-tokens');
    for (const file of fs.readdirSync(folder)) fs.writeFileSync(path.join(folder, file), '{"broken":"cli_must_not_leak"');
    const before = vaultSnapshot();
    const file = tokenFile('command.json', { url: host, token: 'cli_blackbox_identity' });
    try {
      for (const args of [['--cli-token-file', file, 'auth', 'status'], ['auth', 'status', `--cli-token-file=${file}`]]) {
        const status = await runCli(args); assert.equal(status.code, 0, status.stderr);
        const data = JSON.parse(status.stdout).data;
        assert.equal(data.source, 'file-cli-token'); assert.equal(data.account.open_id, 'external-user');
        assert.equal(data.cli_token.expires_at, '2027-01-01T00:00:00.000Z');
        assert.ok(!status.stdout.includes('cli_blackbox_identity'));
      }
      const environmentStatus = await runCli(['auth', 'status'], { AE_CLI_TOKEN: 'cli_blackbox_identity', AE_CLI_TOKEN_HOST: host });
      assert.equal(environmentStatus.code, 0, environmentStatus.stderr);
      assert.equal(JSON.parse(environmentStatus.stdout).data.source, 'environment-cli-token');
      const secondFile = tokenFile('second-user.json', { url: host, token: 'cli_blackbox_second_user' });
      let requestCount = requestTokens.length;
      const repeatedFile = await runCli(['--cli-token-file', file, 'auth', 'status', `--cli-token-file=${secondFile}`]);
      assert.equal(repeatedFile.code, 0, repeatedFile.stderr);
      assert.deepEqual(requestTokens.slice(requestCount), ['cli_blackbox_second_user']);
      assert.equal(JSON.parse(repeatedFile.stdout).data.account.open_id, 'external-second-user');
      requestCount = requestTokens.length;
      const repeatedHost = await runCli(['--host=https://unselected.example.com', 'auth', 'status', '--host', host], { AE_CLI_TOKEN: 'cli_blackbox_identity', AE_CLI_TOKEN_HOST: host });
      assert.equal(repeatedHost.code, 0, repeatedHost.stderr);
      assert.deepEqual(requestTokens.slice(requestCount), ['cli_blackbox_identity']);
      const literals = await runCli(['auth', 'status', '--', '--cli-token-file', secondFile, '--host', 'https://unselected.example.com'], { AE_CLI_TOKEN: 'cli_blackbox_identity', AE_CLI_TOKEN_HOST: host });
      assert.equal(literals.code, 0, literals.stderr);
      assert.equal(requestTokens.at(-1), 'cli_blackbox_identity');
      requestCount = requests.length;
      for (const args of [['auth', 'status', '--cli-token-file'], ['auth', 'status', '--host']]) {
        const missing = await runCli(args, { AE_CLI_TOKEN: 'cli_blackbox_identity', AE_CLI_TOKEN_HOST: host });
        assert.equal(missing.code, 1); assert.equal(JSON.parse(missing.stderr).error.code, 'MISSING_OPTION_VALUE');
      }
      const wrongFinalHost = await runCli(['--host', host, 'auth', 'status', '--host=https://unselected.example.com'], { AE_CLI_TOKEN: 'cli_blackbox_identity', AE_CLI_TOKEN_HOST: host });
      assert.equal(wrongFinalHost.code, 1); assert.equal(JSON.parse(wrongFinalHost.stderr).error.code, 'EXTERNAL_CLI_TOKEN_INVALID');
      assert.equal(requests.length, requestCount, 'invalid or missing final options must not trigger startup probes');
      const business = await runCli(['--cli-token-file', file, 'capability', 'list', '--domain', 'analysis']);
      assert.equal(business.code, 0, business.stderr);
      for (const args of [['auth'], ['auth', 'login', '--no-wait'], ['auth', 'set-token', '--token-stdin'], ['auth', 'use', '--account', 'someone'], ['auth', 'logout'], ['auth', 'logout', '--all']]) {
        const result = await runCli(['--cli-token-file', file, ...args]);
        assert.equal(result.code, 1); assert.equal(JSON.parse(result.stderr).error.code, 'EXTERNAL_CLI_TOKEN_ACTIVE');
      }
      assert.deepEqual(vaultSnapshot(), before);
      assert.ok(!requests.some(url => url.includes('generate') || url.includes('cli_blackbox_identity')));
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });

  await test('invalid explicit input fails before requests without fallback; help remains accessible', async () => {
    const result = await runCli(['capability', 'list', '--domain', 'analysis'], { AE_CLI_TOKEN: '', AE_CLI_TOKEN_HOST: 'https://invalid.example.com' });
    assert.equal(result.code, 1); assert.equal(JSON.parse(result.stderr).error.code, 'EXTERNAL_CLI_TOKEN_INVALID');
    const mismatch = await runCli(['auth', 'status', '--host', 'https://other.example.com'], { AE_CLI_TOKEN: 'cli_valid_fixture', AE_CLI_TOKEN_HOST: 'https://host.example.com' });
    assert.equal(mismatch.code, 1); assert.equal(JSON.parse(mismatch.stderr).error.type, 'config');
    const help = await runCli(['--cli-token-file', 'missing-file', 'auth', 'status', '--help']);
    assert.equal(help.code, 0, help.stderr);
  });
} finally {
  globalThis.fetch = originalFetch; setExternalCliTokenFile(undefined);
  for (const key of environmentKeys) {
    const value = originalEnv[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  fs.rmSync(directory, { recursive: true, force: true });
}
process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exitCode = 1;
