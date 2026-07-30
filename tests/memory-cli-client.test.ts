import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import { clearCliToken } from '../src/core/cli-token.ts';
import {
  getMemoryCli,
  postMemoryCli,
  resolveMemoryApiBaseUrl,
} from '../src/commands/memory/cli-client.ts';
import { markUsedMemory, writeContextMemory } from '../src/commands/memory/index.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const originalEnv = {
  HOME: process.env.HOME,
  SANDBOX_RUNTIME_ROOT: process.env.SANDBOX_RUNTIME_ROOT,
  TE_CLAUDE_BASE_PATH: process.env.TE_CLAUDE_BASE_PATH,
  AE_API_PREFIX: process.env.AE_API_PREFIX,
};
const originalFetch = globalThis.fetch;
const host = 'http://te-claude.local';

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function ctx(values: Record<string, unknown> = {}): RuntimeContext {
  return {
    str: (name) => typeof values[name] === 'string' ? String(values[name]) : '',
    num: (name) => typeof values[name] === 'number' ? Number(values[name]) : 0,
    optionalNum: (name) => typeof values[name] === 'number' ? Number(values[name]) : undefined,
    bool: () => false,
    json: (name) => values[name],
    api: async () => {
      throw new Error('not used');
    },
    querySql: async () => {
      throw new Error('not used');
    },
    queryReportData: async () => {
      throw new Error('not used');
    },
    token: async () => '',
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'memory',
    out: () => {},
  };
}

try {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-memory-cli-token-'));
  fs.mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(
    path.join(runtimeRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: host, token: 'cli_test' }),
  );
  process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-memory-home-'));
  process.env.SANDBOX_RUNTIME_ROOT = runtimeRoot;
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;
  clearCliToken(host);

  let capturedUrl = '';
  let capturedHeaders = new Headers();
  let capturedBody = '';
  let requestCount = 0;
  let responseStatus = 200;
  let responseData: unknown = { ok: true };
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requestCount += 1;
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    capturedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ ok: true, data: responseData }), {
      status: responseStatus,
    });
  }) as typeof fetch;

  await postMemoryCli(ctx(), 'memories', { content: '偏好' });
  assert.equal(capturedUrl, `${host}/agent/api/cli/memory/v1/memories`);
  assert.equal(capturedHeaders.get('cli-token'), 'cli_test');
  assert.equal(capturedHeaders.get('Authorization'), null);
  assert.equal(capturedHeaders.get('X-Sandbox-Id'), null);
  assert.equal(capturedHeaders.get('X-Sandbox-Secret-Key'), null);
  assert.equal(capturedHeaders.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(capturedBody), { content: '偏好' });

  await getMemoryCli(ctx(), 'memories?scopeType=agent&agentId=agent-1');
  assert.equal(
    capturedUrl,
    `${host}/agent/api/cli/memory/v1/memories?scopeType=agent&agentId=agent-1`,
  );
  assert.equal(capturedHeaders.get('cli-token'), 'cli_test');
  assert.equal(capturedHeaders.get('Content-Type'), null);

  requestCount = 0;
  responseStatus = 401;
  await assert.rejects(
    () => markUsedMemory.execute(ctx({ agentId: 'agent-1', ids: ['memory-1'] })),
    (error: unknown) =>
      error instanceof CapabilityGatewayError && error.httpStatus === 401,
  );
  assert.equal(requestCount, 1);

  requestCount = 0;
  responseStatus = 202;
  responseData = { status: 'accepted', requestedCount: 2 };
  const markUsedResult = await markUsedMemory.execute(
    ctx({ agentId: 'agent-1', ids: ['memory-1', 'memory-2'] }),
  );
  assert.equal(requestCount, 1);
  assert.equal(capturedUrl, `${host}/agent/api/cli/memory/v1/memories/use`);
  assert.deepEqual(JSON.parse(capturedBody), {
    agentId: 'agent-1',
    ids: ['memory-1', 'memory-2'],
  });
  assert.deepEqual(
    { ...(markUsedResult as Record<string, unknown>) },
    { status: 'accepted', requestedCount: 2 },
  );

  const contextFile = path.join(runtimeRoot, 'AGENTS.md');
  requestCount = 0;
  responseStatus = 200;
  responseData = {
    items: [
      { id: 'memory-context-1', type: 'preference', content: 'Prefer direct answers' },
    ],
  };
  const writeResult = await writeContextMemory.execute(
    ctx({ file: contextFile, agentId: 'agent-context', limit: 3 }),
  );
  assert.equal(requestCount, 1);
  assert.equal(capturedUrl, `${host}/agent/api/cli/memory/v1/memories/context`);
  assert.doesNotMatch(capturedUrl, /\/memories\/use$/);
  assert.deepEqual(JSON.parse(capturedBody), { agentId: 'agent-context', limit: 3 });
  assert.deepEqual(writeResult, {
    file: contextFile,
    count: 1,
    markers: ['<!-- ae-cli:user-memory:start -->', '<!-- ae-cli:user-memory:end -->'],
  });
  assert.match(fs.readFileSync(contextFile, 'utf8'), /ae:user-memory-id="memory-context-1"/);
  responseData = { ok: true };

  process.env.TE_CLAUDE_BASE_PATH = '/custom-agent';
  await getMemoryCli(ctx(), 'memories');
  assert.equal(capturedUrl, `${host}/custom-agent/api/cli/memory/v1/memories`);

  delete process.env.TE_CLAUDE_BASE_PATH;
  process.env.AE_API_PREFIX = 'agent';
  await getMemoryCli(ctx(), 'memories');
  assert.equal(capturedUrl, `${host}/agent/api/cli/memory/v1/memories`);
  assert.equal(resolveMemoryApiBaseUrl(`${host}/agent/`), `${host}/agent`);
} finally {
  clearCliToken(host);
  restoreEnv();
  globalThis.fetch = originalFetch;
}

console.log('memory cli client tests passed');
