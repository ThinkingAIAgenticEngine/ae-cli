import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';

test('real concurrent CLI processes keep Run grants separate and reject revocation', async () => {
  const active = new Map([['test-a', 'run-a'], ['test-b', 'run-b']]);
  const observed: string[] = [];
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const grant = String(request.headers['x-te-page-context-token']);
    observed.push(grant);
    assert.equal(request.url, '/agent/api/internal/dashboard-context/mcp');
    assert.equal(JSON.parse(body).params.name, 'read_current_page_context');
    const runId = active.get(grant);
    response.setHeader('Content-Type', 'application/json');
    if (!runId) { response.writeHead(403); response.end('{}'); return; }
    response.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {
      content: [{ type: 'text', text: JSON.stringify({ read: { runId }, payload: { name: runId } }) }],
    } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/agent/api/internal/dashboard-context/mcp`;
  const command = new URL('../src/commands/context/current.ts', import.meta.url).href;
  const run = (token: string) => new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
      `import { createCurrentPageContextCommand } from ${JSON.stringify(command)};
       try { console.log(JSON.stringify(await createCurrentPageContextCommand().execute({}))); }
       catch (error) { console.log(error.code); process.exitCode = 1; }`,
    ], { env: { ...process.env, TE_AGENT_CONVERSATION_ID: token,
      TE_AGENT_PAGE_CONTEXT_MCP_URL: url, TE_AGENT_PAGE_CONTEXT_TOKEN: token },
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, output }));
  });
  try {
    const [a, b] = await Promise.all([run('test-a'), run('test-b')]);
    assert.equal(a.code, 0, a.output);
    assert.equal(b.code, 0, b.output);
    assert.equal(JSON.parse(a.output).read.runId, 'run-a');
    assert.equal(JSON.parse(b.output).read.runId, 'run-b');
    active.delete('test-a');
    const denied = await run('test-a');
    assert.equal(denied.code, 1);
    assert.equal(denied.output.trim(), 'CURRENT_PAGE_CONTEXT_UNAVAILABLE');
    assert.equal(observed.filter((value) => value === 'test-a').length, 2, 'no credential fallback or retry');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
