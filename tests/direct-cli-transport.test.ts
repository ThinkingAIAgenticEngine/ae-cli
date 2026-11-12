import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { kbApi } from '../src/core/mcp-access.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
import { readExternalCliToken } from '../src/core/external-cli-token.ts';
import { fetchSigned, getFromMainApp, uploadToMainApp } from '../src/core/te-agent-client.ts';
import { executeCapability } from '../src/core/capability-api.ts';
import { callMcpTool } from '../src/core/mcp.ts';
import { fetchCliConfig } from '../src/core/compat-check.ts';
import { requestSandboxEvaluationSession } from '../src/core/eval-session.ts';
import { evalRequest } from '../src/core/eval-client.ts';
import { normalizeResourceUrlFields } from '../src/core/resource-url.ts';
import { runWithCliAgentContext } from '../src/core/cli-agent-context.ts';

test('direct HTTP preserves source, identity, context, original transports and status', { timeout: 60000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'cli-direct-http-'));
  const original = { ...process.env };
  const requests: { url: string; headers: http.IncomingHttpHeaders; bytes: number; body: string }[] = [];
  let validationStatus = 200;
  const server = http.createServer({ maxHeaderSize: 65536 }, async (request, response) => {
    let bytes = 0; const chunks: Buffer[] = [];
    for await (const chunk of request) { bytes += chunk.length; if (bytes < 65536) chunks.push(chunk); }
    const body = Buffer.concat(chunks).toString();
    requests.push({ url: request.url!, headers: request.headers, bytes, body });
    response.setHeader('Content-Type', 'application/json');
    if (request.url?.endsWith('/validate')) {
      response.statusCode = validationStatus;
      response.end(JSON.stringify({ return_code: 0, data: { openId: 'current-user', loginName: 'current-login', userName: 'Current', expiresAt: '2027-01-01T00:00:00Z' } }));
    } else if (request.url === '/v1/ta/cli/config') {
      response.end(JSON.stringify({ return_code: 0, data: { versions: { clusterVersion: '6.0', aeCliVersion: '6.0.60' }, businesses: { dataops: false }, sw_cfg_enable_global_query: 'on' } }));
    } else if (request.url?.includes('/mcp/community/http/')) {
      response.end(JSON.stringify({ jsonrpc: '2.0', id: JSON.parse(body).id, result: { content: [{ type: 'text', text: 'ok' }] } }));
    } else if (request.url?.endsWith('/evaluation/session')) {
      response.end(JSON.stringify({ session_token: 'synthetic-session', expires_in: 900 }));
    } else if (request.url?.endsWith('/retry')) {
      response.writeHead(429, { 'Retry-After': '13', 'X-RateLimit-Remaining': '0' }).end('{"error":"limited"}');
    } else if (request.url?.endsWith('/binary')) {
      response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="proof.bin"' }).end(Buffer.from([0, 255, 1, 128]));
    } else if (request.url?.endsWith('/events')) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' });
      response.write('data: first\n\n');
      const timer = setTimeout(() => response.end('data: last\n\n'), 1000);
      response.on('close', () => clearTimeout(timer));
    } else response.end(JSON.stringify({ ok: true, data: { page_url: '/#/report/one', items: [] } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${(server.address() as any).port}`;
  const file = path.join(root, 'cli-token.json');
  const taskContext = { version: 1, grant: 'synthetic.grant', executionId: '00000000-0000-4000-8000-000000000001', sandboxId: 'sandbox-one', companyId: 'company-one' };
  const status = () => new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', 'auth', 'status'], { env: { ...process.env, AE_CLI_NO_COMPAT_CHECK: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }));
  });
  try {
    delete process.env.AE_CLI_TOKEN; delete process.env.AE_CLI_TOKEN_HOST;
    delete process.env.TE_AGENT_CLI_CONFIG_DIR;
    process.env.HOME = root; process.env.AE_CLI_TOKEN_FILE = file;
    for (const sandbox of [false, true]) {
      if (sandbox) process.env.SANDBOX_RUNTIME_ROOT = root; else delete process.env.SANDBOX_RUNTIME_ROOT;
      await writeFile(file, JSON.stringify({ url: host, token: 'cli_current_user', ...(sandbox ? { taskContext } : {}) }));
      const start = requests.length;
      const context = { user_intent: '中'.repeat(2048), session_goal: '文'.repeat(2048) };
      const result = await runWithCliAgentContext(context, () => executeCapability(host, 'analysis', 'analysis.asset.search', { project_id: 101 }));
      normalizeResourceUrlFields(result, host);
      assert.equal(result.page_url, `${host}/#/report/one`);
      const analysis = requests.findLast(r => r.url.includes('/api/cli/analysis/'))!;
      assert.equal(Buffer.from(String(analysis.headers['x-ta-cli-user-intent']), 'base64url').toString(), context.user_intent);
      assert.equal(Buffer.from(String(analysis.headers['x-ta-cli-session-goal']), 'base64url').toString(), context.session_goal);
      assert.equal(analysis.headers['x-task-cli-grant'], undefined);
      for (const name of ['analysis', 'content', 'hot']) {
        await callMcpTool(`${host}/mcp/community/http/${name}`, 'fixture', {}, host);
        assert.equal(requests.at(-1)!.headers['mcp-protocol-version'], '2025-11-25');
      }
      await getFromMainApp('/api/external/agents/list');
      assert.equal(requests.at(-1)!.headers['x-task-cli-grant'], undefined);
      await getFromMainApp('/api/sandbox/models');
      assert.equal(requests.at(-1)!.headers['x-task-cli-grant'], sandbox ? taskContext.grant : undefined);
      assert.equal(requests.at(-1)!.headers['x-sandbox-secret-key'], undefined);
      const kbContext = { host: () => host, str: () => undefined } as unknown as RuntimeContext;
      for (const operation of ['read', 'grep', 'index', 'list', 'ask']) {
        await kbApi(kbContext, 'POST', `/agent/api/external/knowledge-bases/${operation}`);
        const headers = requests.at(-1)!.headers;
        const includeTask = sandbox && ['read', 'grep', 'index'].includes(operation);
        assert.equal(headers['cli-token'], 'cli_current_user');
        assert.equal(headers['x-task-cli-grant'], includeTask ? taskContext.grant : undefined, operation);
        assert.equal(headers['x-task-cli-execution'], includeTask ? taskContext.executionId : undefined);
        assert.equal(headers['x-task-cli-company'], includeTask ? taskContext.companyId : undefined);
        assert.equal(headers['x-task-cli-sandbox'], includeTask ? taskContext.sandboxId : undefined);
        assert.equal(headers['x-sandbox-secret-key'], undefined);
      }
      await kbApi(kbContext, 'GET', '/agent/api/external/knowledge-bases/read');
      assert.equal(requests.at(-1)!.headers['x-task-cli-grant'], undefined);
      const config = await fetchCliConfig(host, 'cli_current_user');
      assert.equal(config?.aeCliVersion, '6.0.60'); assert.equal(config?.businesses?.dataops, false);
      // Evaluation requires an online-shaped host. Only the test fetch adapter maps it to the local receiver.
      const evaluationHost = 'https://evaluation-fixture.invalid';
      await writeFile(file, JSON.stringify({ url: evaluationHost, token: 'cli_current_user', ...(sandbox ? { taskContext } : {}) }));
      const localFetch = ((url, init) => fetch(host + new URL(String(url)).pathname, init)) as typeof fetch;
      const session = await requestSandboxEvaluationSession(evaluationHost, 'cli_current_user', '101', localFetch);
      await evalRequest({ baseUrl: evaluationHost, path: '/tasks', method: 'GET', headers: { Authorization: `Bearer ${session}` }, fetchImpl: localFetch });
      await writeFile(file, JSON.stringify({ url: host, token: 'cli_current_user', ...(sandbox ? { taskContext } : {}) }));
      assert.equal(requests.at(-1)!.headers.authorization, 'Bearer synthetic-session');
      assert.equal(requests.at(-1)!.headers['cli-token'], undefined);
      for (const sizes of [[50], [30, 30], [50, 50, 50, 50]]) {
        const form = new FormData();
        for (const [index, size] of sizes.entries()) form.append('files', new Blob([new Uint8Array(size * 1024 * 1024)]), `large-${index}.bin`);
        await uploadToMainApp('/api/external/upload', form);
        assert.ok(requests.at(-1)!.bytes > sizes.reduce((a, b) => a + b, 0) * 1024 * 1024);
      }
      const binary = await fetchSigned({ method: 'GET', path: '/binary' });
      assert.deepEqual(Buffer.from(await binary.arrayBuffer()), Buffer.from([0, 255, 1, 128]));
      assert.match(binary.headers.get('content-disposition')!, /proof.bin/);
      const retry = await fetchSigned({ method: 'GET', path: '/retry' });
      assert.equal(retry.status, 429); assert.equal(retry.headers.get('retry-after'), '13');
      assert.equal(retry.headers.get('x-ratelimit-remaining'), '0'); await retry.text();
      const stream = await fetchSigned({ method: 'GET', path: '/events' });
      const reader = stream.body!.getReader();
      assert.equal(new TextDecoder().decode((await reader.read()).value), 'data: first\n\n'); await reader.cancel();
      const auth = await status(); assert.equal(auth.code, 0, auth.stderr);
      assert.equal(JSON.parse(auth.stdout).data.account.open_id, 'current-user');
      assert.equal(JSON.parse(auth.stdout).data.cli_token.expires_at, '2027-01-01T00:00:00.000Z');
      for (const request of requests.slice(start)) {
        assert.equal(request.headers['x-source'], sandbox ? 'te-agent' : 'ae-cli', request.url);
        assert.ok(request.headers['x-ta-cli-version']);
        assert.ok(!request.url.includes('cli_current_user'));
      }
    }
    validationStatus = 503;
    const failed = await status(); assert.equal(failed.code, 1);
    assert.match(failed.stderr, /CLI_TOKEN_VALIDATION_UNAVAILABLE/);
    assert.ok(!failed.stdout.includes('trusted_cli_token'));
    await writeFile(file, JSON.stringify({ blocked: 'PI_CLI_AUTH_REQUIRED' }));
    assert.throws(() => readExternalCliToken(), /could not prepare/);
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
    await rm(root, { recursive: true, force: true });
  }
});
