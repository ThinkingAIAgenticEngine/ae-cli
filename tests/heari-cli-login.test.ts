import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { after, test } from 'node:test';

const directory = mkdtempSync(join(tmpdir(), 'ae-heari-login-'));
process.env.HOME = directory;
process.env.SANDBOX_RUNTIME_ROOT = join(directory, 'runtime');
for (const key of ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE', 'TE_AGENT_CLI_CONFIG_DIR']) {
  delete process.env[key];
}
after(() => rmSync(directory, { recursive: true, force: true }));

const { exchangeHeariCredentials } = await import('../src/core/heari-cli-login.ts');
const { addHost, setActiveHost } = await import('../src/core/config.ts');
const { saveCredential } = await import('../src/core/secure-store.ts');
const registration = {
  audience: 'https://heari.example',
  execution_id: 'cli-12345678-1234-4123-8123-123456789abc',
  ticket: 'x'.repeat(43),
};

test('personal login follows the active host and account and sends each credential only to its recipient', async t => {
  const first = 'https://ae-one.example';
  const second = 'https://ae-two.example';
  addHost(first, 'first');
  addHost(second, 'second');
  assert.equal(await exchangeHeariCredentials(), undefined);
  const calls: string[][] = [];
  t.mock.method(globalThis, 'fetch', async (input: URL, init: RequestInit) => {
    assert.equal(init.redirect, 'error');
    assert.equal(init.method, 'POST');
    const headers = new Headers(init.headers);
    if (input.origin === registration.audience) {
      assert.equal(input.pathname, '/api/auth/ae/agent/exchange');
      assert.equal(headers.has('cli-token'), false);
      assert.deepEqual(JSON.parse(String(init.body)), { ticket: registration.ticket, execution_id: registration.execution_id });
      return Response.json({ access_token: 'short-lived', expires_in: 300 });
    }
    assert.equal(input.pathname, '/v1/ta/heari/agent/cli-ticket');
    assert.equal(init.body, undefined);
    calls.push([input.origin, headers.get('cli-token')!]);
    return Response.json(registration);
  });
  for (const [host, token] of [[first, 'cli_alice'], [first, 'cli_bob'], [second, 'cli_cara']]) {
    setActiveHost(host);
    saveCredential(host, { cliToken: token });
    assert.deepEqual(await exchangeHeariCredentials(), { token: 'short-lived', endpoint: registration.audience + '/mcp' });
  }
  assert.deepEqual(calls, [[first, 'cli_alice'], [first, 'cli_bob'], [second, 'cli_cara']]);
});

test('rejects denied tickets, insecure destinations, malformed identifiers and expired credentials', async t => {
  process.env.AE_CLI_TOKEN = 'cli_test';
  process.env.AE_CLI_TOKEN_HOST = 'https://ae.example';
  t.after(() => { delete process.env.AE_CLI_TOKEN; delete process.env.AE_CLI_TOKEN_HOST; });
  for (const responses of [
    [new Response(null, { status: 403 })],
    [Response.json({ ...registration, audience: 'http://heari.example' })],
    [Response.json({ ...registration, execution_id: 'cli-' + '-'.repeat(36) })],
    [Response.json(registration), Response.json({ access_token: 'expired', expires_in: 0 })],
  ]) {
    const mock = t.mock.method(globalThis, 'fetch', () => {
      assert.ok(responses.length);
      return responses.shift();
    });
    await assert.rejects(exchangeHeariCredentials(), /HearI/);
    assert.equal(responses.length, 0);
    mock.mock.restore();
  }
});

test('HTTP failures expose only the stage, origin, status and recognised code', async t => {
  process.env.AE_CLI_TOKEN = 'cli_test';
  process.env.AE_CLI_TOKEN_HOST = 'https://ae.example';
  t.after(() => { delete process.env.AE_CLI_TOKEN; delete process.env.AE_CLI_TOKEN_HOST; });
  for (const detail of ['AE_SSO_GRANT_REJECTED', 'secret-unrecognised-body']) {
    const mock = t.mock.method(globalThis, 'fetch', (url: URL) =>
      url.origin === registration.audience
        ? Response.json({ detail, secret: 'must-remain-private' }, { status: 401 })
        : Response.json(registration));
    await assert.rejects(exchangeHeariCredentials(), (error: any) => {
      assert.deepEqual(error.aeDiagnostic, {
        stage: 'agent/exchange', site: registration.audience, http_status: 401,
        service_code: detail === 'AE_SSO_GRANT_REJECTED' ? detail : undefined,
      });
      assert.doesNotMatch(error.message, /secret|private/);
      return true;
    });
    mock.mock.restore();
  }
});

test('explicit endpoints stop login, reads and online diagnostics after ticket issuance on mismatch', async t => {
  if (Number(process.versions.node.split('.')[0]) < 22) return t.skip('HearI requires Node.js 22');
  process.env.AE_CLI_TOKEN = 'cli_test';
  process.env.AE_CLI_TOKEN_HOST = 'https://ae.example';
  t.after(() => { delete process.env.AE_CLI_TOKEN; delete process.env.AE_CLI_TOKEN_HOST; });
  const { run } = await import('../bin/heari/engine.mjs');
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: URL) => {
    calls.push(url.href);
    return Response.json(registration);
  });
  for (const args of [['login', '--endpoint', 'https://other.example/mcp'], ['studies', 'list'],
    ['auth', 'status', '--online'], ['doctor', '--online']]) {
    calls.length = 0;
    let output = '';
    const sink = new Writable({ write(chunk, encoding, done) { output += chunk; done(); } });
    const result = await run(['--lang', 'en-US', ...args, '--no-input'], {
      env: args[0] === 'login' ? {} : { HEARI_ENDPOINT: 'https://other.example/mcp' },
      directory, stdout: sink, stderr: sink, aeCredentials: exchangeHeariCredentials,
      fetcher: async () => assert.fail('Endpoint mismatch must stop before MCP'),
    });
    assert.equal(result, 1, output);
    const report = JSON.parse(output);
    assert.equal((report.error ?? report.checks.find((c: any) => c.status === 'FAIL')).code, 'CONFIG');
    assert.deepEqual(calls, ['https://ae.example/v1/ta/heari/agent/cli-ticket']);
  }
});
