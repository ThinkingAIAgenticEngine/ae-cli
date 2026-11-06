import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectDirectory = fileURLToPath(new URL('..', import.meta.url));
const entrypoints = ['src/index.ts', 'src/ai-monitor.ts'];
const token = 'cli_ai_monitor_entrypoint_test';
const agentContext = {
  agent_client: 'ai-monitor-test',
  agent_model: 'test-model',
  agent_session_id: 'test-session',
};
const encodedContext = Buffer.from(JSON.stringify(agentContext)).toString('base64url');
const queryArgs = ['conversation', 'count', '--platform', 'te-claude', '--environment', 'agent007', '--last-days', '30'];

function runCli(entrypoint: string, args: string[], directory: string, extraEnv: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env };
  for (const key of ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE']) delete env[key];
  Object.assign(env, {
    AE_CLI_NO_COMPAT_CHECK: '1',
    TE_AGENT_CLI_CONFIG_DIR: join(directory, 'session'),
    SANDBOX_RUNTIME_ROOT: join(directory, 'runtime'),
    TA_CLI_CONTEXT_FILE: join(directory, 'missing-context.json'),
    NO_COLOR: '1',
  }, extraEnv);
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', entrypoint, ...args], {
      cwd: projectDirectory, env, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => { child.kill('SIGKILL'); }, 20_000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', code => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
  });
}

test('real AI Monitor entrypoints share external credentials and agent context', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ai-monitor-entrypoints-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const requests: { path: string; token: string | string[] | undefined; body: any; agent: string | string[] | undefined }[] = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({
      path: req.url!, token: req.headers['cli-token'],
      body: body ? JSON.parse(body) : undefined,
      agent: req.headers['x-ta-cli-agent-client'],
    });
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.startsWith('/ai-monitor/api/cli/v1/capabilities/')) {
      const bytes = Buffer.from('PK\x03\x04entrypoint-test');
      const data = req.url.includes('.export/execute') ? {
        archive: { encoding: 'base64', media_type: 'application/zip', file_name: 'test.zip', byte_length: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), content_base64: bytes.toString('base64') },
        manifest: { complete: false, failures: [{ trace_id: 'unavailable' }] },
      } : { count: 3, future_field: { retained: true }, quality: { available: false } };
      res.end(JSON.stringify({ ok: true, data, meta: {} }));
    } else {
      res.end(JSON.stringify({ return_code: 0, data: {} }));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  const file = join(directory, 'token.json');
  const contents = JSON.stringify({ url: host, token });
  writeFileSync(file, contents, { mode: 0o400 });
  mkdirSync(join(directory, 'session'));
  writeFileSync(join(directory, 'session', 'cli-token.json'), JSON.stringify({ url: host, token: 'cli_wrong_session' }));

  function cliArgs(entrypoint: string, flags: string[], query = queryArgs) {
    return [...flags, ...(entrypoint.endsWith('/index.ts') ? ['ai-monitor'] : []), ...query];
  }

  await t.test('both flag syntaxes authenticate with the file and propagate hidden context', async () => {
    for (const entrypoint of entrypoints) {
      for (const flags of [
        ['--cli-token-file', file, '--agent-context', encodedContext],
        [`--cli-token-file=${file}`, `--agent-context=${encodedContext}`],
      ]) {
        const before = requests.length;
        const result = await runCli(entrypoint, cliArgs(entrypoint, flags), directory, {
          AE_CLI_TOKEN: 'cli_wrong_environment', AE_CLI_TOKEN_HOST: host,
        });
        assert.equal(result.code, 0, result.stdout + result.stderr);
        assert.equal(JSON.parse(result.stdout).data.count, 3);
        const capabilities = requests.slice(before).filter(request => request.path.includes('/capabilities/'));
        assert.equal(capabilities.length, 1);
        const request = capabilities[0];
        assert.equal(request.path, '/ai-monitor/api/cli/v1/capabilities/ai_monitor.conversation.count/execute');
        assert.equal(request.token, token);
        assert.deepEqual(request.body.input, { data_token: 'te-claude', report_source: 'agent007', last_days: 30 });
        for (const [key, value] of Object.entries(agentContext)) assert.equal(request.body.client_context[key], value);
        assert.equal(request.agent, Buffer.from(agentContext.agent_client).toString('base64url'));
        assert.ok(!result.stdout.includes(token) && !result.stderr.includes(token));
      }
    }
    assert.equal(readFileSync(file, 'utf8'), contents);
  });

  await t.test('new read families and verified ZIPs work through both real processes', async () => {
    const cases = [
      { command: ['bad-trace', 'count', '--quality-flags', '["l2_infra_instant_death"]', '--user-cancelled', 'false'], id: 'ai_monitor.bad_trace.count', expected: { quality_flags: ['l2_infra_instant_death'], user_cancelled: false } },
      { command: ['overview', 'get', '--last-days', '7'], id: 'ai_monitor.overview.get', expected: { last_days: 7 } },
      { command: ['cost', 'actual-summary', '--start', '2026-11-01', '--end', '2026-11-04'], id: 'ai_monitor.cost.actual_summary', expected: { start: '2026-11-01', end: '2026-11-04' } },
      { command: ['security', 'issues', '--decision', 'pending'], id: 'ai_monitor.security.issues', expected: { decision: 'pending' } },
      { command: ['diagnosis', 'get', '--task-id', 'task-1'], id: 'ai_monitor.diagnosis.get', expected: { task_id: 'task-1' } },
      { command: ['investigation', 'run-get', '--case-id', 'case-1', '--run-id', 'run-1'], id: 'ai_monitor.investigation.run_get', expected: { case_id: 'case-1', run_id: 'run-1' } },
      { command: ['conversation', 'get', '--conversation-id', 'c1', '--include-spans', '--span-limit', '2'], id: 'ai_monitor.conversation.get', expected: { conversation_id: 'c1', include_spans: true, span_limit: 2 } },
      { command: ['trace', 'export', '--trace-ids', '["trace-1"]'], id: 'ai_monitor.trace.export', expected: { trace_ids: ['trace-1'] } },
    ];
    for (const entrypoint of entrypoints) {
      for (const item of cases) {
        const output = join(directory, `${entrypoint.endsWith('/index.ts') ? 'ae' : 'standalone'}.zip`);
        const before = requests.length;
        const query = [...item.command, '--platform', 'te-claude', '--environment', 'agent007', ...(item.id.endsWith('.export') ? ['--output', output] : [])];
        const result = await runCli(entrypoint, cliArgs(entrypoint, ['--cli-token-file', file], query), directory);
        assert.equal(result.code, 0, result.stdout + result.stderr);
        const dispatched = requests.slice(before).filter(request => request.path.includes('/capabilities/'));
        assert.equal(dispatched.length, 1);
        assert.equal(dispatched[0].path, `/ai-monitor/api/cli/v1/capabilities/${item.id}/execute`);
        for (const [key, value] of Object.entries(item.expected)) assert.deepEqual(dispatched[0].body.input[key], value);
        const payload = JSON.parse(result.stdout).data;
        if (item.id.endsWith('.export')) {
          assert.equal(payload.output_file, output);
          assert.equal(payload.manifest.complete, false);
          assert.ok(readFileSync(output).length > 0);
          assert.ok(!result.stdout.includes('content_base64'));
        } else assert.equal(payload.future_field.retained, true);
      }
    }
  });

  await t.test('standalone retains environment and session credentials without new flags', async () => {
    for (const [extraEnv, expectedToken] of [
      [{ AE_CLI_TOKEN: token, AE_CLI_TOKEN_HOST: host }, token],
      [{}, 'cli_wrong_session'],
    ] as const) {
      const before = requests.length;
      const result = await runCli('src/ai-monitor.ts', queryArgs, directory, extraEnv);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      const capabilities = requests.slice(before).filter(request => request.path.includes('/capabilities/'));
      assert.equal(capabilities.length, 1);
      assert.equal(capabilities[0].token, expectedToken);
    }
  });

  await t.test('standalone accepts global credentials and context after the leaf command', async () => {
    const before = requests.length;
    const result = await runCli('src/ai-monitor.ts', [
      ...queryArgs, '--cli-token-file', file, '--agent-context', encodedContext,
    ], directory);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const capabilities = requests.slice(before).filter(request => request.path.includes('/capabilities/'));
    assert.equal(capabilities.length, 1);
    assert.equal(capabilities[0].token, token);
    assert.equal(capabilities[0].body.client_context.agent_session_id, agentContext.agent_session_id);
  });

  await t.test('invalid files and mismatched hosts fail closed before any HTTP request', async () => {
    const malformed = join(directory, 'malformed.json');
    writeFileSync(malformed, '{"token":"cli_secret_must_not_leak"');
    for (const entrypoint of entrypoints) {
      for (const flags of [
        ['--cli-token-file', join(directory, 'missing.json')],
        ['--cli-token-file', malformed],
        ['--cli-token-file', file, '--host', 'http://127.0.0.1:1'],
      ]) {
        const before = requests.length;
        const result = await runCli(entrypoint, cliArgs(entrypoint, flags), directory);
        assert.equal(result.code, 1, result.stdout + result.stderr);
        assert.equal(result.stdout, '');
        assert.equal(JSON.parse(result.stderr).error.code, 'EXTERNAL_CLI_TOKEN_INVALID');
        assert.equal(requests.length, before);
        assert.ok(!result.stdout.includes('cli_secret_must_not_leak') && !result.stderr.includes('cli_secret_must_not_leak'));
      }
    }
  });

  await t.test('standalone command-local host overrides are checked before sending credentials', async () => {
    const before = requests.length;
    const result = await runCli('src/ai-monitor.ts', [
      '--cli-token-file', file, '--host', host, ...queryArgs, '--host', 'http://127.0.0.1:1',
    ], directory);
    assert.equal(result.code, 1, result.stdout + result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(JSON.parse(result.stderr).error.code, 'EXTERNAL_CLI_TOKEN_INVALID');
    assert.equal(requests.length, before);
  });

  await t.test('help and version work without readable credentials and context stays hidden', async () => {
    for (const entrypoint of entrypoints) {
      for (const flag of ['--help', '--version']) {
        const result = await runCli(entrypoint, ['--cli-token-file', join(directory, 'missing.json'), flag], directory);
        assert.equal(result.code, 0, result.stdout + result.stderr);
        if (flag === '--help') {
          assert.ok(result.stdout.includes('--cli-token-file'));
          assert.ok(!result.stdout.includes('--agent-context'));
        }
      }
    }
  });

  await t.test('standalone retains Commander missing-value errors before authentication', async () => {
    for (const flag of ['--host', '--cli-token-file']) {
      const before = requests.length;
      const result = await runCli('src/ai-monitor.ts', [flag], directory);
      assert.equal(result.code, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /argument missing/);
      assert.doesNotMatch(result.stderr, /at globalOptionValue|MISSING_OPTION_VALUE/);
      assert.equal(requests.length, before);
    }
  });
});

test('local AI Monitor entrypoints follow Agent availability for execution and read-only help', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'ai-monitor-local-business-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, 'home');
  const config = join(home, '.ae-cli');
  mkdirSync(config, { recursive: true });
  let state: boolean | undefined = false;
  const requests: string[] = [];
  const version = JSON.parse(readFileSync(join(projectDirectory, 'package.json'), 'utf8')).version;
  const server = createServer(async (req, res) => {
    for await (const _chunk of req) { /* Drain the local fixture request. */ }
    requests.push(req.url!);
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/ta/cli/config') {
      res.end(JSON.stringify({ return_code: 0, data: { versions: { clusterVersion: '6.0', aeCliVersion: version },
        businesses: state === undefined ? {} : { agent: state } } }));
    } else if (req.url?.startsWith('/ai-monitor/api/cli/v1/capabilities/')) {
      res.end(JSON.stringify({ ok: true, data: { count: 3 }, meta: {} }));
    } else res.end(JSON.stringify({ return_code: 0, data: {} }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  const localEnv = { HOME: home, USERPROFILE: home, TE_AGENT_CLI_CONFIG_DIR: undefined,
    SANDBOX_RUNTIME_ROOT: undefined, AE_CLI_TOKEN: token, AE_CLI_TOKEN_HOST: host };
  const cacheKey = (value: string) => `${host}#${createHash('sha256').update(value).digest('hex')}`;
  const writeState = (value: boolean | undefined, extra: Record<string, unknown> = {}) => {
    state = value;
    writeFileSync(join(config, 'config.json'), JSON.stringify({ activeHost: host, hosts: { [host]: { label: 'local fixture' } } }));
    writeFileSync(join(config, 'business-config.json'), JSON.stringify({ entries: {
      [cacheKey(token)]: { businesses: value === undefined ? {} : { agent: value }, fetchedAt: Date.now() }, ...extra,
    } }));
  };
  const args = (entry: string, query: string[]) => [...(entry.endsWith('/index.ts') ? ['ai-monitor'] : []), ...query];
  const dispatched = () => requests.filter(url => url.startsWith('/ai-monitor/api/cli/v1/capabilities/')).length;

  await t.test('both entrypoints block a disabled Agent before friendly or raw-scope dispatch', async () => {
    writeState(false);
    for (const entry of entrypoints) {
      for (const query of [queryArgs, ['trace', 'count', '--data-token', 'platform-key', '--report-source', 'runtime-key']]) {
        const before = dispatched();
        const result = await runCli(entry, args(entry, query), directory, localEnv);
        assert.equal(result.code, 1, result.stdout + result.stderr);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /BUSINESS_NOT_ENABLED/);
        assert.equal(dispatched(), before);
      }
    }
  });

  await t.test('both entrypoints retain true and unknown compatibility', async () => {
    for (const value of [true, undefined]) {
      writeState(value);
      for (const entry of entrypoints) {
        const before = dispatched();
        const result = await runCli(entry, args(entry, queryArgs), directory, localEnv);
        assert.equal(result.code, 0, result.stdout + result.stderr);
        assert.equal(JSON.parse(result.stdout).data.count, 3);
        assert.equal(dispatched(), before + 1);
      }
    }
  });

  await t.test('disabled root help is read-only for both entrypoints', async () => {
    writeState(false);
    for (const entry of entrypoints) {
      const before = requests.length;
      const result = await runCli(entry, ['--help'], directory, localEnv);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      if (entry.endsWith('/index.ts')) assert.doesNotMatch(result.stdout, /^\s+ai-monitor\s/m);
      else {
        assert.match(result.stdout, /business is not enabled/);
        assert.doesNotMatch(result.stdout, /Commands:/);
      }
      assert.equal(requests.length, before);
    }
  });

  await t.test('file-selected help uses that credential identity instead of the enabled environment token', async () => {
    const fileToken = 'cli_ai_monitor_disabled_file_context';
    const file = join(directory, 'disabled-identity.json');
    writeFileSync(file, JSON.stringify({ url: host, token: fileToken }), { mode: 0o400 });
    const contents = readFileSync(file, 'utf8');
    writeState(true, { [cacheKey(fileToken)]: { businesses: { agent: false }, fetchedAt: Date.now() } });
    for (const entry of entrypoints) {
      const before = requests.length;
      const result = await runCli(entry, [`--cli-token-file=${file}`, '--help'], directory, localEnv);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      if (entry.endsWith('/index.ts')) assert.doesNotMatch(result.stdout, /^\s+ai-monitor\s/m);
      else assert.match(result.stdout, /business is not enabled/);
      assert.equal(requests.length, before);
    }
    assert.equal(readFileSync(file, 'utf8'), contents);
  });
});
