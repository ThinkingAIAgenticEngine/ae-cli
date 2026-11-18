import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const cli = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const loader = import.meta.resolve('tsx');

test('Web onboarding runs and resumes with direct execution credentials', { timeout: 60_000 }, async t => {
  const logs = fileURLToPath(new URL('../log/', import.meta.url));
  fs.mkdirSync(logs, { recursive: true });
  const root = fs.mkdtempSync(path.join(logs, 'onboarding-direct-'));
  const conversation = path.join(root, 'chat-one');
  fs.mkdirSync(conversation);
  const file = path.join(root, 'cli-token.json');
  let token = 'cli_synthetic_direct_one';
  let context = { version: 1, grant: 'synthetic.one', executionId: 'execution-one', sandboxId: 'sandbox-one', companyId: 'company-one' };
  let actor = { account_id: 'account-one', company_id: 'company-one', conversation_id: 'chat-one' };
  let identityStatus = 200;
  const calls: string[] = [];
  const server = http.createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk);
      const input = Buffer.concat(chunks).toString();
      calls.push(request.url!);
      assert.equal(request.headers['cli-token'], token);
      response.setHeader('Content-Type', 'application/json');
      if (request.url === '/agent/api/sandbox/onboarding/context') {
        assert.equal(request.headers['x-task-cli-grant'], context.grant);
        assert.equal(request.headers['x-task-cli-execution'], context.executionId);
        assert.equal(request.headers['x-task-cli-company'], context.companyId);
        assert.equal(request.headers['x-task-cli-sandbox'], context.sandboxId);
        assert.equal(request.headers['x-sandbox-secret-key'], undefined);
        response.writeHead(identityStatus).end(JSON.stringify({ actor }));
      } else {
        assert.equal(request.headers['x-task-cli-grant'], undefined);
        if (request.url?.endsWith('/project.plg_demo.context/execute')) {
          response.end(JSON.stringify({ ok: true, data: { business_project: { project_id: 7 }, recommended_sample: 'star-island' } }));
        } else if (/\/project\.plg_demo\.(ensure|status)\/execute$/.test(request.url ?? '')) {
          assert.deepEqual(JSON.parse(input).input, { sample_id: 'star-island' });
          response.end(JSON.stringify({ ok: true, data: { status: 'ready', project_id: 42, evidence: { dashboard_url: '/#/panel/panel/42_3' } } }));
        } else if (request.url?.endsWith('/token/renew')) {
          response.end(JSON.stringify({ return_code: 0 }));
        } else {
          response.writeHead(404).end(JSON.stringify({ error: 'Unexpected endpoint' }));
        }
      }
    } catch (error) {
      response.writeHead(500).end(JSON.stringify({ error: String(error) }));
    }
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const writeCredential = (includeContext = true) => fs.writeFileSync(file, JSON.stringify({ url: host, token, ...(includeContext ? { taskContext: context } : {}) }), { mode: 0o600 });
  const env: NodeJS.ProcessEnv = { ...process.env, AE_CLI_TOKEN_FILE: file, AE_CLI_NO_COMPAT_CHECK: '1', SANDBOX_RUNTIME_ROOT: root, TE_AGENT_CURRENT_AGENT_ID: 'system-agent-onboarding-guide', TE_AGENT_CONVERSATION_ID: 'chat-one' };
  for (const key of ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TASK_PROXY', 'TE_AGENT_CLI_CONFIG_DIR', 'TE_CLAUDE_BASE_URL', 'AE_CLI_WEBSITE_ENV']) delete env[key];
  const run = (...args: string[]) => new Promise<{ code: number | null; output: any; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', loader, cli, 'analysis', 'onboarding', ...args], { cwd: conversation, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      try { resolve({ code, output: JSON.parse(stdout || stderr), stderr }); }
      catch { reject(new Error(`CLI returned invalid JSON: ${stdout}\n${stderr}`)); }
    });
  });
  writeCredential();
  const first = await run('run', '--choice', 'demo');
  assert.equal(first.code, 0, JSON.stringify(first.output));
  assert.equal(first.output.ok, true);
  assert.equal(first.output.data.demo_project_id, 42);
  const sessionId = first.output.data.session_id;
  assert.equal(typeof sessionId, 'string');
  assert.ok(calls.includes('/agent/api/sandbox/onboarding/context'));

  token = 'cli_synthetic_direct_two';
  context = { ...context, grant: 'synthetic.two', executionId: 'execution-two' };
  writeCredential();
  for (const args of [['status'], ['run', '--dry-run'], ['run']]) {
    const result = await run(...args, '--session-id', sessionId);
    assert.equal(result.code, 0, JSON.stringify(result.output));
    if (args.includes('--dry-run')) assert.equal(result.output.data.dry_run, true);
    else assert.equal(result.output.data.session_id, sessionId);
  }
  const capabilityCount = () => calls.filter(call => call.includes('/capabilities/')).length;
  const beforeRejected = capabilityCount();
  const originalActor = { ...actor };
  for (const mismatch of [
    { account_id: 'account-other' },
    { company_id: 'company-other' },
    { conversation_id: 'chat-other' },
    { account_id: '' },
    { company_id: '' },
  ]) {
    actor = { ...originalActor, ...mismatch };
    const result = await run('run', '--session-id', sessionId);
    assert.equal(result.code, 1, JSON.stringify(mismatch));
    assert.equal(result.output.ok, false);
  }
  actor = originalActor;
  identityStatus = 403;
  assert.equal((await run('status', '--session-id', sessionId)).code, 1);
  identityStatus = 200;
  writeCredential(false);
  const callsBeforeMissingContext = calls.length;
  const missing = await run('run', '--choice', 'demo');
  assert.equal(missing.code, 1);
  assert.match(missing.output.error.message, /current AE task context/);
  assert.equal(calls.length, callsBeforeMissingContext);
  assert.equal(capabilityCount(), beforeRejected);
});
