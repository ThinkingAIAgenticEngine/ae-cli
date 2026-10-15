import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { test } from 'node:test';
import { createCurrentPageContextCommand } from '../src/commands/context/current.js';

test('current context uses the Run MCP grant without reading sandbox credentials', async () => {
  const saved = { ...process.env };
  const originalRead = fs.readFileSync;
  const originalFetch = globalThis.fetch;
  let credentialReads = 0;
  try {
    process.env.TE_AGENT_CONVERSATION_ID = 'conversation-a';
    process.env.TE_AGENT_PAGE_CONTEXT_MCP_URL = 'http://main-app/agent/api/internal/dashboard-context/mcp';
    process.env.TE_AGENT_PAGE_CONTEXT_TOKEN = 'test-run-a-grant';
    fs.readFileSync = ((file: unknown, ...args: unknown[]) => {
      if (String(file).endsWith('/credentials.json')) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
      if (String(file).endsWith('/.env')) {
        credentialReads++;
        throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
      }
      return (originalRead as Function)(file, ...args);
    }) as typeof fs.readFileSync;
    syncBuiltinESMExports();
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), process.env.TE_AGENT_PAGE_CONTEXT_MCP_URL);
      assert.equal(new Headers(init?.headers).get('X-TE-Page-Context-Token'), 'test-run-a-grant');
      assert.equal(new Headers(init?.headers).has('X-Sandbox-Secret-Key'), false);
      assert.equal(init?.redirect, 'error');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.method, 'tools/call');
      assert.deepEqual(body.params, { name: 'read_current_page_context', arguments: {} });
      return Response.json({ jsonrpc: '2.0', id: body.id, result: {
        content: [{ type: 'text', text: JSON.stringify({ read: { runId: 'run-a' }, payload: { name: 'Dashboard A' } }) }],
      } });
    };
    assert.deepEqual(JSON.parse(JSON.stringify(await createCurrentPageContextCommand().execute({} as never))), {
      read: { runId: 'run-a' }, payload: { name: 'Dashboard A' },
    });
    assert.equal(credentialReads, 0);
    globalThis.fetch = async () => new Response('', { status: 403 });
    await assert.rejects(createCurrentPageContextCommand().execute({} as never), /403|authoriz|permission/i);
    assert.equal(credentialReads, 0, 'expired grants must not fall back to broader credentials');
    for (const result of [{ isError: true, content: [{ type: 'text', text: 'run_unavailable' }] },
      { content: [] }]) {
      globalThis.fetch = async () => Response.json({ jsonrpc: '2.0', id: 1, result });
      await assert.rejects(createCurrentPageContextCommand().execute({} as never));
    }
    delete process.env.TE_AGENT_PAGE_CONTEXT_TOKEN;
    globalThis.fetch = async () => { assert.fail('incomplete binding must not issue a request'); };
    await assert.rejects(createCurrentPageContextCommand().execute({} as never), /binding is invalid/);
    assert.equal(credentialReads, 0);
  } finally {
    fs.readFileSync = originalRead;
    syncBuiltinESMExports();
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
