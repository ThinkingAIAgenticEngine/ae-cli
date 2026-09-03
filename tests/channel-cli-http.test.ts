import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { RuntimeContext } from '../src/framework/types.js';

const previousEnv = {
  HOME: process.env.HOME,
  SANDBOX_RUNTIME_ROOT: process.env.SANDBOX_RUNTIME_ROOT,
  TE_CLAUDE_BASE_URL: process.env.TE_CLAUDE_BASE_URL,
  TE_CLAUDE_BASE_PATH: process.env.TE_CLAUDE_BASE_PATH,
  SANDBOX_ID: process.env.SANDBOX_ID,
  SANDBOX_SECRET_KEY: process.env.SANDBOX_SECRET_KEY,
};
const previousFetch = globalThis.fetch;
const tempRoot = mkdtempSync(join(tmpdir(), 'ae-cli-channel-http-'));
const host = 'http://channel-platform.local';

process.env.HOME = join(tempRoot, 'home');
process.env.SANDBOX_RUNTIME_ROOT = join(tempRoot, 'runtime');
delete process.env.TE_CLAUDE_BASE_URL;
delete process.env.TE_CLAUDE_BASE_PATH;
delete process.env.SANDBOX_ID;
delete process.env.SANDBOX_SECRET_KEY;

function createContext(values: Record<string, unknown>): RuntimeContext {
  const get = (name: string) => values[name];
  return {
    str: (name) => String(get(name) ?? ''),
    num: (name) => Number(get(name) ?? 0),
    optionalNum: () => undefined,
    bool: (name) => Boolean(get(name)),
    json: (name) => get(name),
    list: () => [],
    api: async () => undefined,
    communityReport: async () => undefined,
    localDataUpload: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'system',
    out: async () => undefined,
  };
}

try {
  const { clearCliToken } = await import('../src/core/cli-token.js');
  const { save } = await import('../src/core/secure-store.js');
  const { createChannel, listChannels } = await import('../src/commands/te-system/channels.js');
  save(host, {
    accessToken: 'access-channel-http',
    refreshToken: 'refresh-channel-http',
    accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    cliToken: 'cli_channel_http',
  });

  const businessCalls: Array<{
    url: string;
    method: string;
    headers: Headers;
    body: string;
  }> = [];
  let responseBody: unknown = { ok: true, data: { items: [] } };
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (new URL(url).pathname.startsWith('/v1/ta/cli/token/')) {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
    businessCalls.push({
      url,
      method: String(init?.method ?? 'GET'),
      headers: new Headers(init?.headers),
      body: String(init?.body ?? ''),
    });
    return new Response(JSON.stringify(responseBody), { status: 200 });
  }) as typeof fetch;

  const listResult = await listChannels.execute(createContext({}));
  assert.deepEqual(listResult, { items: [] });
  assert.equal(businessCalls[0]?.url, `${host}/agent/api/cli/channel/v1/channels`);
  assert.equal(businessCalls[0]?.method, 'GET');
  assert.equal(businessCalls[0]?.headers.get('cli-token'), 'cli_channel_http');
  assert.equal(businessCalls[0]?.headers.get('Authorization'), null);
  assert.equal(businessCalls[0]?.headers.get('X-Sandbox-Id'), null);

  responseBody = { ok: true, data: { channel_id: 'channel-1' } };
  const createResult = await createChannel.execute(
    createContext({
      channel:
        '{"name":"Ops","type":"slack","config":{"botToken":"test-secret","appToken":"test-app-secret"}}',
    }),
  );
  assert.deepEqual(createResult, { channel_id: 'channel-1' });
  assert.equal(businessCalls[1]?.method, 'POST');
  assert.equal(businessCalls[1]?.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(businessCalls[1]?.body ?? ''), {
    name: 'Ops',
    type: 'slack',
    config: { bot_token: 'test-secret', app_token: 'test-app-secret' },
  });

  clearCliToken(host);
  process.stdout.write('channel CLI HTTP tests passed\n');
} finally {
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(tempRoot, { recursive: true, force: true });
}
