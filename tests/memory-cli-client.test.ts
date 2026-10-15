import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clearCliToken } from '../src/core/cli-token.ts';
import { getMemoryCli, postMemoryCli, resolveMemoryApiBaseUrl } from '../src/commands/memory/cli-client.ts';
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
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function ctx(): RuntimeContext {
  return {
    str: () => '', num: () => 0, optionalNum: () => undefined, bool: () => false,
    json: () => undefined, list: () => [],
    api: async () => { throw new Error('not used'); },
    communityReport: async () => { throw new Error('not used'); },
    localDataUpload: async () => { throw new Error('not used'); },
    querySql: async () => { throw new Error('not used'); },
    queryReportData: async () => { throw new Error('not used'); },
    token: async () => '', host: () => host, mcpUrl: () => undefined, service: () => 'memory', out: async () => {},
  };
}

try {
  const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-memory-v2-token-'));
  fs.mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(path.join(runtimeRoot, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'cli_test' }));
  process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-memory-v2-home-'));
  process.env.SANDBOX_RUNTIME_ROOT = runtimeRoot;
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;
  clearCliToken(host);

  let capturedUrl = '';
  let capturedHeaders = new Headers();
  let capturedBody = '';
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    capturedBody = String(init?.body ?? '');
    return new Response(JSON.stringify({ ok: true, data: { accepted: true } }), { status: 200 });
  }) as typeof fetch;

  const result = await postMemoryCli<{ accepted: boolean }>(ctx(), 'agent-spaces/space-1/memories', { content: 'Preference' });
  assert.deepEqual(result, { accepted: true });
  assert.equal(capturedUrl, `${host}/agent/api/cli/memory/v2/agent-spaces/space-1/memories`);
  assert.equal(capturedHeaders.get('cli-token'), 'cli_test');
  assert.equal(capturedHeaders.get('Authorization'), null);
  assert.deepEqual(JSON.parse(capturedBody), { content: 'Preference' });

  await getMemoryCli(ctx(), 'target?agentSpaceId=space-1');
  assert.equal(capturedUrl, `${host}/agent/api/cli/memory/v2/target?agentSpaceId=space-1`);
  assert.equal(capturedHeaders.get('Content-Type'), null);
  assert.equal(resolveMemoryApiBaseUrl(`${host}/agent/`), `${host}/agent`);

  process.env.TE_CLAUDE_BASE_PATH = '/custom-agent';
  await getMemoryCli(ctx(), 'target?agentSpaceId=space-1');
  assert.equal(capturedUrl, `${host}/custom-agent/api/cli/memory/v2/target?agentSpaceId=space-1`);
} finally {
  clearCliToken(host);
  restoreEnv();
  globalThis.fetch = originalFetch;
}

console.log('memory cli client tests passed');
