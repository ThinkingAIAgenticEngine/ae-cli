/**
 * capability-api unit tests — capability gateway transport
 *
 * Run:
 *   npx tsx tests/capability-api.test.ts
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildApiUrl,
  buildCapabilityGatewayUrl,
  callCapabilityApi,
  CapabilityGatewayError,
  dryRunCapability,
  executeCapability,
  executeCapabilityWithEnvelope,
  inspectCapability,
  listCapabilities,
  uploadInputFileBytes,
  validateCapability,
} from '../src/core/capability-api.ts';
import {
  setCliTokenManual as persistCliTokenManual,
  clearCliToken,
  localRenewDate,
} from '../src/core/cli-token.ts';
import { PermissionError } from '../src/core/errors.ts';
import { loadCliToken, markCredentialRenewed, SecureStoreAuthError } from '../src/core/secure-store.ts';

function setCliTokenManual(token: string, host: string): void {
  persistCliTokenManual(token, host);
  markCredentialRenewed(host, token, localRenewDate());
}

let pass = 0;
let fail = 0;

const AGENT_CONTEXT_ENV_KEYS = [
  'TA_CLI_CONTEXT_FILE',
  'TA_CLI_AGENT_CLIENT',
  'TA_CLI_AGENT_MODEL',
  'TA_CLI_AGENT_SESSION_ID',
  'TA_CLI_AGENT_TURN_ID',
  'TA_CLI_PARENT_TURN_ID',
  'TA_CLI_INTENT_RELATION',
  'TA_CLI_INTENT_REVISION',
  'TA_CLI_RUNTIME',
  'TA_CLI_INTENT_SOURCE',
  'TA_CLI_SESSION_INITIAL_INTENT',
  'TA_CLI_USER_INTENT',
  'TA_CLI_USER_INTENT_HASH',
  'TA_CLI_SESSION_GOAL',
  'TA_CLI_CONTEXT_CAPTURE_STATUS',
] as const;

const AGENT_RUNTIME_ENV_KEYS = [
  'CODEX_SESSION_ID',
  'CODEX_THREAD_ID',
  'CODEX_VERSION',
  'CODEX_SHELL',
  'CODEX_MODEL',
  'OPENAI_MODEL',
  'CODEX_INTERNAL_ORIGINATOR_OVERRIDE',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_SESSION_ID',
  'CLAUDECODE',
  'CLAUDE_CODE',
  'CLAUDE_CODE_MODEL',
  'CLAUDE_MODEL',
  'ANTHROPIC_MODEL',
  'WORKBUDDY_SESSION_ID',
  'WORKBUDDY_AGENT_ID',
  'WORKBUDDY_RUNTIME',
  'WORKBUDDY_MODEL',
  'WORKBUDDY_AGENT_MODEL',
  'WORKBUDDY_CONVERSATION_ID',
] as const;

const ALL_AGENT_ENV_KEYS = [
  ...AGENT_CONTEXT_ENV_KEYS,
  ...AGENT_RUNTIME_ENV_KEYS,
] as const;

function saveAndClearEnv(keys: readonly string[]): Map<string, string | undefined> {
  const previousEnv = new Map<string, string | undefined>();
  for (const key of keys) {
    previousEnv.set(key, process.env[key]);
    delete process.env[key];
  }
  return previousEnv;
}

function restoreEnv(previousEnv: Map<string, string | undefined>): void {
  for (const [key, value] of previousEnv.entries()) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function disableContextFileDiscovery(): void {
  process.env.TA_CLI_CONTEXT_FILE = path.join(
    os.tmpdir(),
    `ae-cli-missing-agent-context-${process.pid}-${Date.now()}-${Math.random()}.json`,
  );
}

function withProcessArgv(args: string[]): string[] {
  const previousArgv = process.argv;
  process.argv = ['node', 'ae-cli', ...args];
  return previousArgv;
}

function restoreProcessArgv(previousArgv: string[]): void {
  process.argv = previousArgv;
}

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`    ${msg}\n`);
  }
}

process.stdout.write('\ncapability-api tests\n');

await test('buildCapabilityGatewayUrl: domain + v1 path + query params', () => {
  const url = buildCapabilityGatewayUrl(
    'https://ta.example.com',
    'metadata',
    'capabilities/metadata.event.get',
    { debug: 1 },
  );
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/api/cli/metadata/v1/capabilities/metadata.event.get');
  assert.equal(parsed.searchParams.get('debug'), '1');
});

await test('buildApiUrl: legacy alias maps to v1 path', () => {
  const url = buildApiUrl('https://ta.example.com/', '/metadata/', '/capabilities/');
  assert.equal(url, 'https://ta.example.com/api/cli/metadata/v1/capabilities');
});

await test('listCapabilities sends cli-token header', async () => {
  const host = 'https://test-cap-list.internal';
  clearCliToken(host);
  setCliTokenManual('cli-list-token', host);
  const previousSandboxRoot = process.env.SANDBOX_RUNTIME_ROOT;
  delete process.env.SANDBOX_RUNTIME_ROOT;

  let capturedToken: string | undefined;
  let capturedSource: string | undefined;
  let capturedUrl = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedToken = (init?.headers as Record<string, string>)?.['cli-token'];
    capturedSource = (init?.headers as Record<string, string>)?.['X-Source'];
    return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await listCapabilities(host, 'metadata', 42);
    assert.equal(capturedToken, 'cli-list-token');
    assert.equal(capturedSource, 'ae-cli');
    assert.equal(new URL(capturedUrl).searchParams.get('project_id'), '42');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    if (previousSandboxRoot === undefined) {
      delete process.env.SANDBOX_RUNTIME_ROOT;
    } else {
      process.env.SANDBOX_RUNTIME_ROOT = previousSandboxRoot;
    }
  }
});

await test('listCapabilities marks sandbox calls as te-agent', async () => {
  const host = 'https://test-cap-agent-source.internal';
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-agent-source-'));
  const previousSandboxRoot = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = sandboxRoot;
  fs.mkdirSync(path.join(sandboxRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(
    path.join(sandboxRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli-agent-token' }),
  );
  clearCliToken(host);
  setCliTokenManual('cli-agent-token', host);

  let capturedSource: string | undefined;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedSource = (init?.headers as Record<string, string>)?.['X-Source'];
    return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await listCapabilities(host, 'analysis', 20);
    assert.equal(capturedSource, 'te-agent');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    if (previousSandboxRoot === undefined) {
      delete process.env.SANDBOX_RUNTIME_ROOT;
    } else {
      process.env.SANDBOX_RUNTIME_ROOT = previousSandboxRoot;
    }
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
});

await test('listCapabilities omits project_id for company-level discovery', async () => {
  const host = 'https://test-cap-list-company.internal';
  clearCliToken(host);
  setCliTokenManual('cli-list-company-token', host);

  let capturedUrl = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
  }) as typeof fetch;

  try {
    await listCapabilities(host, 'metadata');
    assert.equal(new URL(capturedUrl).searchParams.has('project_id'), false);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability POSTs { input } to .../execute', async () => {
  const host = 'https://test-cap-exec.internal';
  clearCliToken(host);
  setCliTokenManual('cli-exec-token', host);
  const previousEnv = saveAndClearEnv(ALL_AGENT_ENV_KEYS);
  disableContextFileDiscovery();

  let capturedUrl = '';
  let capturedBody: any;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body;
    return new Response(JSON.stringify({ ok: true, data: { event_name: 'x' } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await executeCapability(host, 'metadata', 'metadata.event.get', {
      project_id: 1,
      event_name: 'purchase',
    });
    assert.ok(capturedUrl.includes('/api/cli/metadata/v1/capabilities/metadata.event.get/execute'));
    assert.equal(capturedBody, JSON.stringify({ input: { project_id: 1, event_name: 'purchase' } }));
    assert.equal(JSON.stringify(result), JSON.stringify({ event_name: 'x' }));
  } finally {
    globalThis.fetch = prevFetch;
    restoreEnv(previousEnv);
    clearCliToken(host);
  }
});

await test('executeCapability infers partial Codex agent context from runtime environment', async () => {
  const host = 'https://test-cap-agent-context-infer.internal';
  clearCliToken(host);
  setCliTokenManual('cli-agent-context-infer-token', host);
  const previousEnv = saveAndClearEnv(ALL_AGENT_ENV_KEYS);
  disableContextFileDiscovery();
  process.env.CODEX_THREAD_ID = 'codex-thread-1';
  process.env.CODEX_VERSION = '0.155.0';
  process.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE = 'Codex Desktop';

  let capturedHeaders: Record<string, string> = {};
  let capturedBody = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeaders = init?.headers as Record<string, string>;
    capturedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    await executeCapability(host, 'analysis', 'analysis.dashboard.list', { project_id: 1 });
    assert.equal(capturedHeaders['X-TA-CLI-Context-Encoding'], 'base64url');
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Client'], Buffer.from('codex', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Session-Id'], Buffer.from('codex-thread-1', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Runtime'], Buffer.from('codex_desktop', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Intent-Source'], Buffer.from('runtime_env', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Context-Capture-Status'], Buffer.from('partial', 'utf8').toString('base64url'));
    const body = JSON.parse(capturedBody);
    assert.deepEqual(body.input, { project_id: 1 });
    assert.equal(body.client_context.agent_client, 'codex');
    assert.equal(body.client_context.agent_session_id, 'codex-thread-1');
    assert.equal(body.client_context.context_capture_status, 'partial');
  } finally {
    globalThis.fetch = prevFetch;
    restoreEnv(previousEnv);
    clearCliToken(host);
  }
});

await test('executeCapability merges hidden agent-context argument over runtime context', async () => {
  const host = 'https://test-cap-agent-context-argument.internal';
  clearCliToken(host);
  setCliTokenManual('cli-agent-context-argument-token', host);
  const previousEnv = saveAndClearEnv(ALL_AGENT_ENV_KEYS);
  disableContextFileDiscovery();
  process.env.CODEX_THREAD_ID = 'codex-thread-argument';
  process.env.CODEX_VERSION = '0.155.0';
  process.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE = 'Codex Desktop';
  const payload = Buffer.from(JSON.stringify({
    agent_turn_id: 'turn-argument-2',
    parent_turn_id: 'turn-argument-1',
    intent_relation: 'correction',
    intent_revision: 2,
    user_intent: '只看项目2的核心看板',
    session_goal: '盘点项目2可用于分析的看板',
  }), 'utf8').toString('base64url');
  const previousArgv = withProcessArgv([
    'analysis',
    'dashboard',
    'list',
    '--agent-context',
    payload,
  ]);

  let capturedHeaders: Record<string, string> = {};
  let capturedBody = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeaders = init?.headers as Record<string, string>;
    capturedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    await executeCapability(host, 'analysis', 'analysis.dashboard.list', { project_id: 2 });
    assert.equal(capturedHeaders['X-TA-CLI-Context-Encoding'], 'base64url');
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Client'], Buffer.from('codex', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Session-Id'], Buffer.from('codex-thread-argument', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Turn-Id'], Buffer.from('turn-argument-2', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-User-Intent'], Buffer.from('只看项目2的核心看板', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Intent-Source'], Buffer.from('agent_argument', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Context-Capture-Status'], Buffer.from('full', 'utf8').toString('base64url'));
    const body = JSON.parse(capturedBody);
    assert.deepEqual(body.input, { project_id: 2 });
    assert.equal(body.client_context.agent_client, 'codex');
    assert.equal(body.client_context.agent_session_id, 'codex-thread-argument');
    assert.equal(body.client_context.agent_turn_id, 'turn-argument-2');
    assert.equal(body.client_context.user_intent, '只看项目2的核心看板');
    assert.equal(body.client_context.intent_revision, '2');
    assert.equal(body.client_context.context_capture_status, 'full');
  } finally {
    globalThis.fetch = prevFetch;
    restoreProcessArgv(previousArgv);
    restoreEnv(previousEnv);
    clearCliToken(host);
  }
});

await test('executeCapability automatically attaches optional agent context from context file', async () => {
  const host = 'https://test-cap-agent-context.internal';
  clearCliToken(host);
  setCliTokenManual('cli-agent-context-token', host);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-agent-context-'));
  const contextFile = path.join(dir, 'current.json');
  fs.writeFileSync(contextFile, JSON.stringify({
    agent_client: 'codex',
    agent_model: 'gpt-5.5',
    agent_session_id: 'sess-1',
    agent_turn_id: 'turn-2',
    parent_turn_id: 'turn-1',
    intent_relation: 'refinement',
    intent_source: 'raw_user_prompt',
    user_intent: '不对，是只看美国区',
    session_goal: '分析项目A最近7天留存表现',
  }));
  const previousContextFile = process.env.TA_CLI_CONTEXT_FILE;
  process.env.TA_CLI_CONTEXT_FILE = contextFile;

  let capturedHeaders: Record<string, string> = {};
  let capturedBody = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeaders = init?.headers as Record<string, string>;
    capturedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    await executeCapability(host, 'analysis', 'analysis.adhoc.run', { project_id: 1 });
    assert.equal(capturedHeaders['X-TA-CLI-Context-Encoding'], 'base64url');
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Client'], Buffer.from('codex', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Model'], Buffer.from('gpt-5.5', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Session-Id'], Buffer.from('sess-1', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Turn-Id'], Buffer.from('turn-2', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Parent-Turn-Id'], Buffer.from('turn-1', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Intent-Relation'], Buffer.from('refinement', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Intent-Source'], Buffer.from('raw_user_prompt', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-User-Intent'], Buffer.from('不对，是只看美国区', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Session-Goal'], Buffer.from('分析项目A最近7天留存表现', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Context-Capture-Status'], Buffer.from('full', 'utf8').toString('base64url'));
    const body = JSON.parse(capturedBody);
    assert.deepEqual(body.input, { project_id: 1 });
    assert.equal(body.client_context.agent_client, 'codex');
    assert.equal(body.client_context.user_intent, '不对，是只看美国区');
    assert.equal(body.client_context.session_goal, '分析项目A最近7天留存表现');
    assert.equal(body.client_context.context_capture_status, 'full');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    if (previousContextFile === undefined) {
      delete process.env.TA_CLI_CONTEXT_FILE;
    } else {
      process.env.TA_CLI_CONTEXT_FILE = previousContextFile;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await test('executeCapability prefers context file over hidden agent-context argument', async () => {
  const host = 'https://test-cap-agent-context-file-priority.internal';
  clearCliToken(host);
  setCliTokenManual('cli-agent-context-file-priority-token', host);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-agent-context-file-priority-'));
  const contextFile = path.join(dir, 'current.json');
  fs.writeFileSync(contextFile, JSON.stringify({
    agent_client: 'codex',
    agent_session_id: 'sess-file',
    agent_turn_id: 'turn-file',
    intent_relation: 'correction',
    intent_revision: 3,
    intent_source: 'agent_context_file',
    user_intent: '查询项目 2 当前可访问的分析看板',
    session_goal: '确认项目 2 的看板列表和可用字段',
  }));
  const argumentPayload = Buffer.from(JSON.stringify({
    agent_client: 'codex',
    agent_session_id: 'sess-argument',
    agent_turn_id: 'turn-argument',
    intent_source: 'agent_argument',
    user_intent: 'List accessible analysis dashboards for project 2',
    session_goal: 'Query dashboards',
  }), 'utf8').toString('base64url');
  const previousEnv = saveAndClearEnv(ALL_AGENT_ENV_KEYS);
  process.env.TA_CLI_CONTEXT_FILE = contextFile;
  const previousArgv = withProcessArgv([
    'analysis',
    'dashboard',
    'list',
    '--agent-context',
    argumentPayload,
  ]);

  let capturedHeaders: Record<string, string> = {};
  let capturedBody = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeaders = init?.headers as Record<string, string>;
    capturedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    await executeCapability(host, 'analysis', 'analysis.dashboard.list', { project_id: 2 });
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Session-Id'], Buffer.from('sess-file', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Agent-Turn-Id'], Buffer.from('turn-file', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-Intent-Source'], Buffer.from('agent_context_file', 'utf8').toString('base64url'));
    assert.equal(capturedHeaders['X-TA-CLI-User-Intent'], Buffer.from('查询项目 2 当前可访问的分析看板', 'utf8').toString('base64url'));
    const body = JSON.parse(capturedBody);
    assert.equal(body.client_context.agent_session_id, 'sess-file');
    assert.equal(body.client_context.agent_turn_id, 'turn-file');
    assert.equal(body.client_context.user_intent, '查询项目 2 当前可访问的分析看板');
    assert.equal(body.client_context.session_goal, '确认项目 2 的看板列表和可用字段');
    assert.equal(body.client_context.intent_revision, '3');
  } finally {
    globalThis.fetch = prevFetch;
    restoreProcessArgv(previousArgv);
    restoreEnv(previousEnv);
    clearCliToken(host);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await test('executeCapability discovers well-known agent context file and rereads intent changes', async () => {
  const host = 'https://test-cap-agent-context-discovery.internal';
  clearCliToken(host);
  setCliTokenManual('cli-agent-context-discovery-token', host);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-agent-context-discovery-'));
  const contextDir = path.join(dir, '.ta');
  const contextFile = path.join(contextDir, 'cli-agent-context.json');
  fs.mkdirSync(contextDir, { recursive: true });
  fs.writeFileSync(contextFile, JSON.stringify({
    agent_client: 'codex',
    agent_model: 'gpt-5.5',
    agent_session_id: 'sess-2',
    agent_turn_id: 'turn-1',
    intent_relation: 'initial',
    intent_revision: 1,
    intent_source: 'agent_context_file',
    session_initial_intent: '看下项目最近留存',
    user_intent: '看下项目最近留存',
    session_goal: '分析项目最近留存表现',
  }));

  const previousCwd = process.cwd();
  const previousEnv = saveAndClearEnv(ALL_AGENT_ENV_KEYS);

  const capturedBodies: any[] = [];
  const capturedHeaders: Record<string, string>[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeaders.push(init?.headers as Record<string, string>);
    capturedBodies.push(JSON.parse(String(init?.body ?? '{}')));
    return new Response(JSON.stringify({ ok: true, data: { ok: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    process.chdir(dir);
    await executeCapability(host, 'analysis', 'analysis.dashboard.list', { project_id: 1 });

    fs.writeFileSync(contextFile, JSON.stringify({
      agent_client: 'codex',
      agent_model: 'gpt-5.5',
      agent_session_id: 'sess-2',
      agent_turn_id: 'turn-2',
      parent_turn_id: 'turn-1',
      intent_relation: 'correction',
      intent_revision: 2,
      intent_source: 'agent_context_file',
      session_initial_intent: '看下项目最近留存',
      user_intent: '不对，只看美国区最近7天留存',
      session_goal: '分析项目最近7天美国区留存表现',
    }));
    await executeCapability(host, 'analysis', 'analysis.dashboard.list', { project_id: 1 });

    assert.equal(capturedBodies.length, 2);
    assert.equal(capturedBodies[0].client_context.user_intent, '看下项目最近留存');
    assert.equal(capturedBodies[0].client_context.intent_revision, '1');
    assert.equal(capturedBodies[0].client_context.context_capture_status, 'full');
    assert.equal(capturedBodies[1].client_context.user_intent, '不对，只看美国区最近7天留存');
    assert.equal(capturedBodies[1].client_context.intent_revision, '2');
    assert.equal(capturedBodies[1].client_context.intent_relation, 'correction');
    assert.equal(capturedHeaders[1]['X-TA-CLI-Intent-Revision'], Buffer.from('2', 'utf8').toString('base64url'));
    assert.equal(
      capturedHeaders[1]['X-TA-CLI-Session-Initial-Intent'],
      Buffer.from('看下项目最近留存', 'utf8').toString('base64url'),
    );
  } finally {
    globalThis.fetch = prevFetch;
    process.chdir(previousCwd);
    restoreEnv(previousEnv);
    clearCliToken(host);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await test('executeCapability preserves unsafe IDs and keeps long decimals numeric', async () => {
  const host = 'https://test-cap-numeric-contract.internal';
  clearCliToken(host);
  setCliTokenManual('cli-numeric-token', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      '{"ok":true,"data":{"id":1524788894514548736,'
        + '"average_response_seconds":5401.925531914893}}',
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const result = await executeCapability(host, 'community', 'community.chat.service_metrics', {});
    assert.equal(result.id, '1524788894514548736');
    assert.equal(typeof result.average_response_seconds, 'number');
    assert.equal(result.average_response_seconds, Number('5401.925531914893'));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('dryRunCapability POSTs { input } to .../dry-run', async () => {
  const host = 'https://test-cap-dry-run.internal';
  clearCliToken(host);
  setCliTokenManual('cli-dry-run-token', host);
  const previousEnv = saveAndClearEnv(ALL_AGENT_ENV_KEYS);
  disableContextFileDiscovery();

  let capturedUrl = '';
  let capturedBody: any;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await dryRunCapability(host, 'analysis', 'analysis.report.list', { project_id: 1 });
    assert.ok(capturedUrl.endsWith('/api/cli/analysis/v1/capabilities/analysis.report.list/dry-run'));
    assert.equal(capturedBody, JSON.stringify({ input: { project_id: 1 } }));
    assert.equal(JSON.stringify(result), JSON.stringify({ dry_run: true }));
  } finally {
    globalThis.fetch = prevFetch;
    restoreEnv(previousEnv);
    clearCliToken(host);
  }
});

await test('validateCapability POSTs { input } to .../validate', async () => {
  const host = 'https://test-cap-validate.internal';
  clearCliToken(host);
  setCliTokenManual('cli-validate-token', host);
  const previousEnv = saveAndClearEnv(ALL_AGENT_ENV_KEYS);
  disableContextFileDiscovery();

  let capturedUrl = '';
  let capturedBody: any;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body;
    return new Response(JSON.stringify({
      ok: true,
      data: { valid: true, capability_id: 'metadata.data_table.sql_write', normalized_input: { project_id: 1 } },
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await validateCapability(host, 'analysis', 'metadata.data_table.sql_write', {
      project_id: 1,
      operation: 'create',
    });
    assert.ok(capturedUrl.endsWith('/api/cli/analysis/v1/capabilities/metadata.data_table.sql_write/validate'));
    assert.equal(
      capturedBody,
      JSON.stringify({ input: { project_id: 1, operation: 'create' } }),
    );
    assert.equal(result.valid, true);
    assert.equal(result.capability_id, 'metadata.data_table.sql_write');
  } finally {
    globalThis.fetch = prevFetch;
    restoreEnv(previousEnv);
    clearCliToken(host);
  }
});

await test('executeCapabilityWithEnvelope preserves success metadata', async () => {
  const host = 'https://test-cap-envelope.internal';
  clearCliToken(host);
  setCliTokenManual('cli-envelope-token', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: true,
    data: { items: [] },
    meta: {
      request_id: 'cli_0123456789abcdef0123456789abcdef',
      invocation_id: 'inv_1',
    },
  }), { status: 200 })) as typeof fetch;

  try {
    const result = await executeCapabilityWithEnvelope(
      host,
      'analysis',
      'analysis.adhoc.run',
      { project_id: 1 },
    );
    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
      ok: true,
      data: { items: [] },
      meta: {
        request_id: 'cli_0123456789abcdef0123456789abcdef',
        invocation_id: 'inv_1',
      },
    });
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability exposes failure metadata on CapabilityGatewayError', async () => {
  const host = 'https://test-cap-error-meta.internal';
  clearCliToken(host);
  setCliTokenManual('cli-error-meta-token', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    ok: false,
    error: {
      code: 'QUERY_FAILED',
      message: 'Query failed.',
    },
    meta: {
      request_id: 'cli_fedcba9876543210fedcba9876543210',
      invocation_id: 'inv_2',
    },
  }), { status: 422 })) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'analysis', 'analysis.adhoc.run', { project_id: 1 }),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.deepEqual(JSON.parse(JSON.stringify(err.meta)), {
          request_id: 'cli_fedcba9876543210fedcba9876543210',
          invocation_id: 'inv_2',
        });
        return true;
      },
    );
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('inspectCapability GETs capability metadata', async () => {
  const host = 'https://test-cap-inspect.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  let capturedUrl = '';
  let method = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    method = init?.method ?? 'GET';
    return new Response(JSON.stringify({ ok: true, data: { id: 'metadata.event.get' } }), { status: 200 });
  }) as typeof fetch;

  try {
    await inspectCapability(host, 'metadata', 'metadata.event.get');
    assert.equal(method, 'GET');
    assert.ok(capturedUrl.endsWith('/api/cli/metadata/v1/capabilities/metadata.event.get'));
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('callCapabilityApi: 403 → PermissionError, no retry', async () => {
  const host = 'https://test-capi-403.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  let callCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    callCount++;
    return new Response(JSON.stringify({
      ok: false,
      error: {
        type: 'permission',
        code: 'CAPABILITY_PERMISSION_DENIED',
        message: 'no permission for this project',
      },
    }), { status: 403 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => callCapabilityApi(host, 'metadata', 'capabilities/metadata.event.get/execute', 'POST', { input: {} }),
      (err: Error) => {
        assert.ok(err instanceof PermissionError);
        assert.equal(err.code, 'CAPABILITY_PERMISSION_DENIED');
        return true;
      },
    );
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: non-2xx response exposes capability error body', async () => {
  const host = 'https://test-capi-422.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'DATA_TABLE_NOT_FOUND',
          message: 'Data table does not exist.',
          hint: 'Check data_table_id.',
        },
      }),
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'metadata', 'metadata.data_table.get', { project_id: 1, data_table_id: 1 }),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.match(err.message, /Data table does not exist/);
        assert.equal(err.code, 'DATA_TABLE_NOT_FOUND');
        assert.equal(err.hint, 'Check data_table_id.');
        assert.equal(err.httpStatus, 422);
        return true;
      },
    );
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: 401 preserves the CLI token and never retries or mints', async () => {
  const host = 'https://test-capi-401.internal';
  clearCliToken(host);
  setCliTokenManual('stale-token', host);

  let apiCallCount = 0;
  let generateCallCount = 0;
  const seenTokens: string[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    const token = (init?.headers as Record<string, string> | undefined)?.['cli-token'];
    if (urlStr.includes('/v1/ta/cli/token/generate')) {
      generateCallCount++;
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'unexpected-token' } }), { status: 200 });
    }
    apiCallCount++;
    seenTokens.push(token ?? '');
    return new Response('Unauthorized', { status: 401 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'metadata', 'metadata.event.get', { project_id: 1, event_name: 'a' }),
      (error: unknown) => error instanceof SecureStoreAuthError && /auth login/.test(error.message),
    );
    assert.equal(apiCallCount, 1);
    assert.deepEqual(seenTokens, ['stale-token']);
    assert.equal(generateCallCount, 0);
    assert.equal(loadCliToken(host), 'stale-token');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: non-2xx response exposes capability error body without retry', async () => {
  const host = 'https://test-capi-401-422.internal';
  clearCliToken(host);
  setCliTokenManual('capability-token', host);

  let apiCallCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    apiCallCount++;
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'INVALID_INPUT_FILE',
          message: 'Input file is invalid.',
        },
      }),
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'metadata', 'metadata.data_table.csv_write', { project_id: 1 }),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.match(err.message, /Input file is invalid/);
        assert.equal(err.code, 'INVALID_INPUT_FILE');
        assert.equal(err.httpStatus, 422);
        return true;
      },
    );
    assert.equal(apiCallCount, 1);
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('uploadInputFileBytes: non-2xx response exposes capability error body', async () => {
  const host = 'https://test-capi-upload-422.internal';
  clearCliToken(host);
  setCliTokenManual('tok', host);

  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'UPLOAD_PURPOSE_INVALID',
          message: 'Unsupported upload purpose.',
        },
      }),
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => uploadInputFileBytes(host, 'metadata', 1, 'data_table.csv', Buffer.from('id\n1\n'), 'data.csv'),
      (err: Error) => {
        assert.ok(err instanceof CapabilityGatewayError);
        assert.match(err.message, /Unsupported upload purpose/);
        assert.equal(err.code, 'UPLOAD_PURPOSE_INVALID');
        assert.equal(err.httpStatus, 422);
        return true;
      },
    );
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('executeCapability: legacy 403 invalid CLI token is auth failure without retry', async () => {
  const host = 'https://test-capi-invalid-token.internal';
  clearCliToken(host);
  setCliTokenManual('stale-token', host);

  let apiCallCount = 0;
  const seenTokens: string[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    const token = (init?.headers as Record<string, string> | undefined)?.['cli-token'];
    assert.ok(!urlStr.includes('/v1/ta/cli/token/generate'));
    apiCallCount++;
    seenTokens.push(token ?? '');
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          type: 'permission',
          message: 'Your token is invalid. Please verify your token and try again.',
        },
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => executeCapability(host, 'metadata', 'metadata.data_table.list', { project_id: 1 }),
      SecureStoreAuthError,
    );
    assert.equal(apiCallCount, 1);
    assert.deepEqual(seenTokens, ['stale-token']);
    assert.equal(loadCliToken(host), 'stale-token');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
