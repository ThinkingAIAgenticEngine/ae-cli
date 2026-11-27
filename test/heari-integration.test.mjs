import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/ae-cli.js', import.meta.url));
const config = mkdtempSync(join(tmpdir(), 'ae-heari-test-'));
after(() => rmSync(config, { recursive: true, force: true }));
function invoke(...args) {
  return spawnSync(process.execPath, [bin, 'heari', ...args], {
    encoding: 'utf8', timeout: 10000,
    env: { XDG_CONFIG_HOME: config, AE_CLI_TOKEN_FILE: join(config, 'absent') },
  });
}

test('the shipped runtime matches its pinned digest', () => {
  const meta = JSON.parse(readFileSync(new URL('../bin/heari/package.json', import.meta.url)));
  const engine = readFileSync(new URL('../bin/heari/engine.mjs', import.meta.url));
  assert.equal(createHash('sha256').update(engine).digest('hex'), meta.sha256);
});

if (Number(process.versions.node.split('.')[0]) < 22) {
  test('HearI explains the runtime requirement on Node 20', () => {
    const result = invoke('--version');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Node.js 22/);
  });
} else {
  test('offline discovery works independently of AE authentication', () => {
    const result = invoke('schema', '--command', 'studies list', '--no-input');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).commands[0].name, 'studies list');
    assert.equal(JSON.parse(result.stdout).locale, 'en-US');
  });

  test('sandbox telemetry leaves offline HearI arguments intact', () => {
    for (const trailer of [['--agent-context', 'e30'], ['--agent-context=e30']]) {
      const result = invoke('schema', '--command', 'studies list', '--no-input', ...trailer);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).commands[0].name, 'studies list');
    }
  });

  test('standalone installation commands direct callers to the host installer', () => {
    for (const args of [['--lang', 'zh-CN', 'update', '--confirm'], ['skills', 'install', '--agent', 'codex', '--confirm']]) {
      const result = invoke(...args, '--no-input');
      assert.equal(result.status, 2);
      assert.equal(result.stdout, '');
      assert.match(JSON.parse(result.stderr).error.message, /ae-cli (install|update)/);
    }
  });

  test('authentication errors keep the HearI error and exit code', () => {
    const result = invoke('studies', 'list', '--no-input');
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'AUTH');
  });
}

if (Number(process.versions.node.split('.')[0]) >= 22) {
  test('AE login and reads use only the registered HearI and keep tickets in memory', async () => {
    const { run } = await import('../bin/heari/engine.mjs');
    const { Writable } = await import('node:stream');
    const { existsSync } = await import('node:fs');
    for (const origin of ['https://test-heari.thinkingdata.cn', 'https://heari.thinkingdata.cn']) {
      const endpoint = origin + '/mcp';
      for (const args of [['login'], ['login', '--no-browser'], ['login', '--endpoint', origin], ['login', '--endpoint', endpoint], ['studies', 'list'], ['login', '--endpoint', 'https://other.invalid/mcp']]) {
        const mismatch = args.includes('https://other.invalid/mcp');
        const calls = [];
        let output = '';
        const sink = new Writable({write(data, encoding, done) { output += data; done(); }});
        const code = await run([...args, '--no-input'], {
          env: {}, directory: config, stdout: sink, stderr: sink,
          aeCredentials: async () => ({ endpoint, token: 'temporary-test-token' }),
          fetcher: async (url, init) => {
            assert.equal(String(url), endpoint);
            const { id, method } = JSON.parse(init.body);
            calls.push(method);
            if (method === 'notifications/initialized') return new Response(null, { status: 202 });
            const result = method === 'initialize' ? { protocolVersion: '2025-06-18' } :
              { content: [], structuredContent: { total: 0, projects: [], next_offset: null } };
            return Response.json({ jsonrpc: '2.0', id, result });
          },
        });
        assert.equal(code, mismatch ? 1 : 0, output);
        if (mismatch) {
          assert.match(output, /CONFIG/);
          assert.deepEqual(calls, []);
        } else assert.ok(calls.includes('tools/call'));
        assert.equal(existsSync(join(config, 'credentials.json')), false);
      }
    }
  });
}

test('AE login help describes environment discovery and excludes standalone browser authorization', () => {
  if (Number(process.versions.node.split('.')[0]) < 22) return;
  const help = invoke('login', '--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /registered with the current AE/);
  assert.doesNotMatch(help.stdout, /127\.0\.0\.1|ta\.heari\.ai|--web/);
  assert.notEqual(invoke('login', '--web', '--no-browser').status, 0);
});

test('AE diagnostic commands share the business identity and preserve exchange failures', async () => {
  const { run } = await import('../bin/heari/engine.mjs');
  const { Writable } = await import('node:stream');
  const site = 'https://test-heari.thinkingdata.cn';
  const diagnostic = { stage: 'agent/exchange', site, http_status: 401, service_code: 'AE_SSO_GRANT_REJECTED' };
  async function check(args, aeCredentials) {
    let output = '';
    const stream = new Writable({write(chunk, enc, done) { output += chunk; done(); }});
    const result = await run(['--lang', 'en-US', ...args, '--no-input'], {
      directory: join(config, 'absent'), env: {}, stdout: stream, stderr: stream, aeCredentials,
      fetcher: async (url, init) => {
        assert.equal(String(url), site + '/mcp');
        const { method, id } = JSON.parse(init.body);
        if (method === 'notifications/initialized') return new Response(null, { status: 202 });
        const responses = {
          initialize: { protocolVersion: '2025-06-18' },
          'tools/list': { tools: [{ name: 'list_projects' }] },
          'tools/call': { content: [], structuredContent: { projects: [], total: 0, next_offset: null } },
        };
        return Response.json({ jsonrpc: '2.0', id, result: responses[method] });
      },
    });
    return { result, report: JSON.parse(output) };
  }
  const rejected = async () => { throw Object.assign(new Error('AE issued a ticket; exchange failed'), { aeDiagnostic: diagnostic }); };
  for (const args of [['login'], ['studies', 'list'], ['auth', 'status', '--online'], ['doctor', '--online']]) {
    const { result, report } = await check(args, rejected);
    assert.equal(result, 1);
    const error = report.error ?? report.checks.find(item => item.status === 'FAIL');
    assert.equal(error.code, 'AUTH');
    for (const [key, value] of Object.entries(diagnostic)) assert.equal(error[key], value);
  }
  for (const args of [['doctor'], ['auth', 'status']]) {
    const { report } = await check(args, () => assert.fail('offline must not exchange'));
    assert.match(JSON.stringify(report), /not been verified offline/);
    const success = await check([...args, '--online'], async () => ({ endpoint: site + '/mcp', token: 'temporary-test-token' }));
    assert.equal(success.result, 0);
    assert.equal(success.report.credential_source, 'ae');
    assert.equal(success.report.endpoint, site + '/mcp');
    assert.ok(success.report.checks.some(c => c.code === 'READ_VERIFIED'));
    assert.doesNotMatch(JSON.stringify(success.report), /temporary-test-token/);
  }
});
