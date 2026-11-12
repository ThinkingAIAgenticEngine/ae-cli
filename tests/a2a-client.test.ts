import assert from 'node:assert/strict';
import test from 'node:test';
import { requestA2a, resolveA2aTarget } from '../src/core/a2a-client.ts';
import { a2aCard, a2aSend, a2aGet, a2aList, a2aCancel, a2aDeleteContext, evaluationExtension } from '../src/commands/te-agent/a2a.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const host = 'https://a2a.example.com';
const endpoint = `${host}/agent/api/a2a/agents/test-agent`;
const card = `${endpoint}/agent-card.json`;
function ctx(flags: Record<string, any>): RuntimeContext {
  return { host: () => host, str: (key: string) => flags[key] ?? '', has: (key: string) => key in flags, optionalNum: (key: string) => flags[key] === undefined ? undefined : Number(flags[key]), optionalBool: (key: string) => flags[key] } as RuntimeContext;
}

test('Card and RPC links resolve to the same host-bound endpoints', () => {
  for (const link of [card, endpoint]) assert.deepEqual(resolveA2aTarget(host, link), { card, rpc: endpoint });
});

test('default discovery preserves host scoping and supports all command previews', async () => {
  const url = `${host}/agent/.well-known/agent-card.json`;
  const rpc = `${host}/agent/api/a2a/agents/system-default-agent`;
  assert.deepEqual(resolveA2aTarget(host, url), { card: url, rpc });
  const input = ctx({ url, message: 'Reply with A2A_OK', id: 'task-1' });
  a2aCard.validate!(input);
  assert.equal((await a2aCard.dryRun!(input)).url, url);
  assert.equal((await a2aSend.dryRun!(input)).url, rpc);
  assert.equal((await a2aGet.dryRun!(input)).url, rpc);
  const customHost = `${host}/tenant/agent`;
  assert.deepEqual(resolveA2aTarget(customHost, `${customHost}/.well-known/agent-card.json`), {
    card: `${customHost}/.well-known/agent-card.json`, rpc: `${customHost}/api/a2a/agents/system-default-agent`,
  });
  assert.throws(() => resolveA2aTarget(customHost, url));
});

for (const link of [
  'https://evil.example.com/agent/api/a2a/agents/test-agent',
  `${card}?token=secret`, `${card}#fragment`, `${host}/other/api/a2a/agents/test-agent`,
  `${host}/agent/api/a2a/agents/a%2Fb`, `${host}/agent/api/a2a/agents/a%5Cb`,
  `${host}/agent/api/a2a/agents/%2e%2e`, `${host}/agent/api/a2a/agents/`,
  'https://user:secret@a2a.example.com/agent/api/a2a/agents/test-agent',
  `${host}/agent/.well-known/agent-card.json?token=secret`,
  `${host}/agent/.well-known/agent-card.json#fragment`,
  `${host}/other/.well-known/agent-card.json`,
  'https://evil.example.com/agent/.well-known/agent-card.json',
  'https://user:secret@a2a.example.com/agent/.well-known/agent-card.json',
]) {
  test(`reject unsafe target ${link.replace('secret', 'redacted')}`, () => assert.throws(() => resolveA2aTarget(host, link)));
}

test('custom deployment paths stay scoped to that path', () => {
  assert.equal(resolveA2aTarget(`${host}/tenant/agent`, `${host}/tenant/agent/api/a2a/agents/a`).rpc,
    `${host}/tenant/agent/api/a2a/agents/a`);
  assert.throws(() => resolveA2aTarget(`${host}/tenant/agent`, card));
});

test('dry-run builds A2A 1.0 payloads without credentials', async () => {
  const input = ctx({ url: card, message: 'Run a task', 'message-id': 'message-1' });
  a2aSend.validate!(input);
  const preview = await a2aSend.dryRun!(input);
  assert.equal(preview.url, endpoint);
  assert.equal(preview.body.method, 'SendMessage');
  assert.equal(preview.body.params.message.role, 'ROLE_USER');
  assert.deepEqual(preview.body.params.message.parts, [{ text: 'Run a task' }]);
  assert.equal(preview.body.params.configuration.returnImmediately, true);
  assert.equal((await a2aGet.dryRun!(ctx({ url: card, id: 'task-1' }))).body.method, 'GetTask');
  assert.equal((await a2aCard.dryRun!(input)).method, 'GET');
  assert.equal(a2aSend.risk, 'write');
  assert.throws(() => a2aSend.validate!(ctx({ url: card, message: ' ' })));
  assert.throws(() => a2aGet.validate!(ctx({ url: card, id: '' })));
});

test('automatic credentials, RPC errors, HTTP errors, and redirect protection', async () => {
  const oldFetch = globalThis.fetch;
  const keys = ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE'];
  const saved = keys.map(key => process.env[key]);
  process.env.AE_CLI_TOKEN = 'cli_a2a_test_only';
  process.env.AE_CLI_TOKEN_HOST = host;
  delete process.env.AE_CLI_TOKEN_FILE;
  let mode = 'success';
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    if (!String(url).includes('/api/a2a/') && !String(url).includes('/.well-known/')) return new Response(JSON.stringify({ code: 0, data: {} }));
    calls++;
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer cli_a2a_test_only');
    assert.equal(new Headers(init?.headers).get('A2A-Version'), '1.0');
    assert.equal(init?.redirect, 'error');
    if (mode === '401' || mode === '403') return new Response('{}', { status: Number(mode) });
    if (mode === 'invalid') return new Response('invalid');
    if (mode === 'redirect') throw new TypeError('redirect');
    if (!init?.body) return Response.json({ name: 'Test Agent' });
    const body = JSON.parse(String(init.body));
    return Response.json({ jsonrpc: '2.0', id: mode === 'mismatch' ? 'other-id' : body.id,
      ...(mode === 'rpc-error' ? { error: { code: -32001, message: 'secret server detail' } } : { result: { id: 'task-1' } }) });
  };
  try {
    assert.deepEqual(await requestA2a(host, card), { name: 'Test Agent' });
    assert.deepEqual(await a2aSend.execute(ctx({ url: card, message: 'Task' })), { id: 'task-1' });
    assert.deepEqual(await a2aGet.execute(ctx({ url: card, id: 'task-1' })), { id: 'task-1' });
    const defaultCard = `${host}/agent/.well-known/agent-card.json`;
    assert.deepEqual(await a2aCard.execute(ctx({ url: defaultCard })), { name: 'Test Agent' });
    assert.deepEqual(await a2aSend.execute(ctx({ url: defaultCard, message: 'Task' })), { id: 'task-1' });
    assert.deepEqual(await a2aGet.execute(ctx({ url: defaultCard, id: 'task-1' })), { id: 'task-1' });
    for (mode of ['401', '403', 'invalid', 'redirect', 'mismatch', 'rpc-error']) {
      await assert.rejects(() => requestA2a(host, card, { jsonrpc: '2.0', id: 'request-1', method: 'GetTask', params: { id: 'task-1' } }),
        (error: any) => {
          assert.ok(!error.message.includes('secret'));
          if (mode === '401') assert.equal(error.errorType, 'auth');
          if (mode === '403') assert.equal(error.errorType, 'permission');
          return true;
        });
    }
    const before = calls;
    await assert.rejects(() => requestA2a(host, 'https://evil.example.com/agent/api/a2a/agents/a'));
    await assert.rejects(() => requestA2a('https://other.example.com', 'https://other.example.com/agent/api/a2a/agents/a'));
    assert.equal(calls, before);
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
  }
});

test('stored login credentials are reused without exposing tokens in results', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const directory = mkdtempSync(join(tmpdir(), 'a2a-stored-auth-'));
  try {
    const script = `
      import assert from 'node:assert/strict';
      import { saveCredential } from './src/core/secure-store.ts';
      import { localRenewDate } from './src/core/cli-token.ts';
      import { requestA2a } from './src/core/a2a-client.ts';
      const host = 'https://stored-a2a.example.com';
      saveCredential(host, { cliToken: 'cli_stored_test_only', lastRenewedOn: localRenewDate() });
      globalThis.fetch = async (url, init) => {
        assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer cli_stored_test_only');
        return Response.json({ name: 'Stored user Agent' });
      };
      assert.deepEqual(await requestA2a(host, host + '/agent/api/a2a/agents/a'), { name: 'Stored user Agent' });
      await assert.rejects(() => requestA2a('https://no-login.example.com', 'https://no-login.example.com/agent/api/a2a/agents/a'), /No stored CLI token/);
    `;
    const env = { ...process.env, HOME: directory };
    for (const key of ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE', 'TE_AGENT_CLI_CONFIG_DIR']) delete env[key];
    execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], { env, timeout: 30_000 });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('workspace and model selection negotiate the extension in payload and transport', async () => {
  const input = ctx({ url: card, message: 'Analyze', 'space-id': 'space_1', model: 'model-1', 'history-length': 0 });
  a2aSend.validate!(input);
  const preview = await a2aSend.dryRun!(input);
  assert.deepEqual(preview.body.params.message.metadata, { [evaluationExtension]: { agentSpaceId: 'space_1', model: 'model-1' } });
  assert.deepEqual(preview.body.params.message.extensions, [evaluationExtension]);
  assert.equal(preview.headers['A2A-Extensions'], evaluationExtension);
  assert.deepEqual(preview.body.params.configuration, { returnImmediately: true, historyLength: 0 });
  const oldFetch = globalThis.fetch;
  const saved = [process.env.AE_CLI_TOKEN, process.env.AE_CLI_TOKEN_HOST];
  process.env.AE_CLI_TOKEN = 'cli_selection_test';
  process.env.AE_CLI_TOKEN_HOST = host;
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('A2A-Extensions'), evaluationExtension);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.params.message.metadata, preview.body.params.message.metadata);
    return Response.json({ jsonrpc: '2.0', id: body.id, result: { id: 'selected-task' } });
  };
  try { assert.deepEqual(await a2aSend.execute(input), { id: 'selected-task' }); }
  finally {
    globalThis.fetch = oldFetch;
    ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST'].forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
  }
  for (const flags of [{ 'space-id': '../space' }, { model: '' }, { model: 'model-1', 'task-id': 'task-1' }, { 'history-length': -1 }]) {
    assert.throws(() => a2aSend.validate!(ctx({ url: card, message: 'Task', ...flags })));
  }
});

test('continuations preserve optional workspace selection for server-side equality checks', async () => {
  for (const continuation of [
    { 'context-id': 'context-1' },
    { 'task-id': 'task-1' },
    { 'context-id': 'context-1', 'task-id': 'task-1' },
  ]) {
    for (const workspace of [{}, { 'space-id': 'original-space' }]) {
      const input = ctx({ url: card, message: 'Continue', ...continuation, ...workspace });
      a2aSend.validate!(input);
      const preview = await a2aSend.dryRun!(input);
      const message = preview.body.params.message;
      assert.equal(message.contextId, continuation['context-id']);
      assert.equal(message.taskId, continuation['task-id']);
      if ('space-id' in workspace) {
        assert.deepEqual(message.metadata, { [evaluationExtension]: { agentSpaceId: 'original-space' } });
        assert.equal(preview.headers['A2A-Extensions'], evaluationExtension);
      } else {
        assert.equal(message.metadata, undefined);
        assert.equal(preview.headers, undefined);
      }
    }
  }
  assert.throws(() => a2aSend.validate!(ctx({ url: card, message: 'Reply',
    'task-id': 'task-1', 'space-id': 'original-space', model: 'model-1' })), /--model cannot be used/);
});

test('task queries preserve zero history, filters, pagination and explicit false', async () => {
  const input = ctx({ url: card, 'context-id': 'context-1', status: 'TASK_STATE_COMPLETED', 'page-size': 10,
    'page-token': 'opaque', 'history-length': 0, 'include-artifacts': false, 'status-timestamp-after': '2026-11-10T00:00:00Z' });
  a2aList.validate!(input);
  assert.deepEqual((await a2aList.dryRun!(input)).body.params, { contextId: 'context-1', status: 'TASK_STATE_COMPLETED',
    pageSize: 10, pageToken: 'opaque', historyLength: 0, includeArtifacts: false, statusTimestampAfter: '2026-11-10T00:00:00Z' });
  assert.equal((await a2aGet.dryRun!(ctx({ url: card, id: 't', 'history-length': 0 }))).body.params.historyLength, 0);
  for (const flags of [{ 'page-size': 101 }, { status: 'done' }, { 'history-length': 1.5 }, { 'page-token': '' }, { 'status-timestamp-after': 'yesterday' }]) {
    assert.throws(() => a2aList.validate!(ctx({ url: card, ...flags })));
  }
  assert.equal(a2aCancel.risk, 'high-risk-write');
  assert.equal(a2aDeleteContext.risk, 'high-risk-write');
  assert.equal((await a2aCancel.dryRun!(ctx({ url: card, id: 't' }))).body.method, 'CancelTask');
  const deletion = await a2aDeleteContext.dryRun!(ctx({ url: card, 'context-id': 'c' }));
  assert.deepEqual(deletion.body.params, { contextId: 'c' });
  assert.equal(deletion.body.method, 'DeleteContext');
  assert.match(deletion.headers['A2A-Extensions'], /context-lifecycle/);
});

test('registered CLI accepts selections and new task commands without credentials in dry-run', async () => {
  const { execFileSync } = await import('node:child_process');
  function run(args: string[]) {
    return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'src/index.ts', 'agent', 'a2a', ...args,
      '--url', card, '--host', host, '--dry-run', '--no-update-check'], { encoding: 'utf8', timeout: 30_000 }));
  }
  const sent = run(['+send', '--message', 'Task', '--space-id', 'space-1', '--model', 'model-1']);
  assert.equal(sent.ok, true);
  assert.match(JSON.stringify(sent), /agentSpaceId/);
  for (const args of [['list', '--page-size', '10'], ['cancel', '--id', 'task-1'], ['delete-context', '--context-id', 'context-1']]) {
    assert.equal(run(args).ok, true);
  }
});

test('401 rereads credentials once and preserves the submission; 403 never retries', async () => {
  const oldFetch = globalThis.fetch;
  const keys = ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE'];
  const saved = keys.map(key => process.env[key]);
  process.env.AE_CLI_TOKEN = 'cli_a2a_old_test';
  process.env.AE_CLI_TOKEN_HOST = host;
  delete process.env.AE_CLI_TOKEN_FILE;
  let calls: RequestInit[] = [];
  let mode = 'recover';
  let firstResponse: Response;
  globalThis.fetch = async (url, init) => {
    if (!String(url).includes('/api/a2a/') && !String(url).includes('/.well-known/')) {
      return Response.json({ code: 0, data: {} });
    }
    calls.push(init!);
    if (calls.length === 1) {
      process.env.AE_CLI_TOKEN = 'cli_a2a_new_test';
      firstResponse = new Response('{}', { status: mode === 'forbidden' ? 403 : 401 });
      return firstResponse;
    }
    if (mode === 'unauthorized') return new Response('{}', { status: 401 });
    if (!init?.body) return Response.json({ name: 'Recovered Agent' });
    const body = JSON.parse(String(init.body));
    return Response.json({ jsonrpc: '2.0', id: body.id, result: { id: 'task-1' } });
  };
  try {
    assert.deepEqual(await a2aSend.execute(ctx({ url: card, message: 'Task', 'message-id': 'stable-message', 'space-id': 'space-1' })), { id: 'task-1' });
    assert.equal(calls.length, 2);
    assert.equal(firstResponse!.bodyUsed, true);
    assert.equal(new Headers(calls[0].headers).get('Authorization'), 'Bearer cli_a2a_old_test');
    assert.equal(new Headers(calls[1].headers).get('Authorization'), 'Bearer cli_a2a_new_test');
    assert.equal(calls[0].body, calls[1].body);
    assert.equal(calls[0].signal, calls[1].signal);
    assert.equal(new Headers(calls[1].headers).get('A2A-Extensions'), evaluationExtension);
    assert.equal(calls[1].redirect, 'error');
    calls = [];
    assert.deepEqual(await requestA2a(host, card), { name: 'Recovered Agent' });
    assert.equal(calls.length, 2);
    for (mode of ['unauthorized', 'forbidden']) {
      calls = [];
      await assert.rejects(() => requestA2a(host, card), (error: any) => {
        assert.equal(error.errorType, mode === 'unauthorized' ? 'auth' : 'permission');
        return true;
      });
      assert.equal(calls.length, mode === 'unauthorized' ? 2 : 1);
    }
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
  }
});
