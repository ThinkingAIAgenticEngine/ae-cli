import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type FetchCall = {
  url: string;
  headers: Headers;
};

const previousEnv = {
  HOME: process.env.HOME,
  SANDBOX_RUNTIME_ROOT: process.env.SANDBOX_RUNTIME_ROOT,
  TE_CLAUDE_BASE_URL: process.env.TE_CLAUDE_BASE_URL,
  SANDBOX_ID: process.env.SANDBOX_ID,
  SECRET_KEY: process.env.SECRET_KEY,
  SANDBOX_SECRET_KEY: process.env.SANDBOX_SECRET_KEY,
};
const previousFetch = globalThis.fetch;
const tempRoot = mkdtempSync(join(tmpdir(), 'ae-cli-agent-unified-auth-'));

process.env.HOME = join(tempRoot, 'home');
process.env.SANDBOX_RUNTIME_ROOT = join(tempRoot, 'runtime');
process.env.TE_CLAUDE_BASE_URL = 'http://sandbox-main-app.local';
process.env.SANDBOX_ID = 'sandbox-id-must-not-leak';
process.env.SECRET_KEY = 'sandbox-secret-must-not-leak';
delete process.env.SANDBOX_SECRET_KEY;

const { getFromMainApp, TeAgentApiError } = await import('../src/core/te-agent-client.ts');
const { clearCliToken } = await import('../src/core/cli-token.ts');
const { PermissionError } = await import('../src/core/errors.ts');
const { save } = await import('../src/core/secure-store.ts');

let passed = 0;
let failed = 0;

async function test(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
    passed += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  }
}

function seedSession(host: string, cliToken: string): void {
  save(host, {
    accessToken: `access-for-${cliToken}`,
    refreshToken: `refresh-for-${cliToken}`,
    accessExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    cliToken,
  });
}

function authPath(url: string): string | null {
  const pathname = new URL(url).pathname;
  return pathname.startsWith('/v1/ta/cli/token/') ? pathname : null;
}

try {
  await test('explicit agent host uses CLI token and ignores legacy sandbox and Bearer credentials', async () => {
    const host = 'http://agent-auth.local';
    seedSession(host, 'cli-agent-auth');
    const businessCalls: FetchCall[] = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (authPath(url)) {
        return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
      }
      businessCalls.push({ url, headers: new Headers(init?.headers) });
      return new Response(JSON.stringify({ agents: [] }), { status: 200 });
    }) as typeof fetch;

    await getFromMainApp('/api/sandbox/agent/agents', host);

    assert.equal(businessCalls.length, 1);
    assert.equal(businessCalls[0].url, `${host}/agent/api/sandbox/agent/agents`);
    assert.equal(businessCalls[0].headers.get('cli-token'), 'cli-agent-auth');
    assert.equal(businessCalls[0].headers.get('Authorization'), null);
    assert.equal(businessCalls[0].headers.get('X-Sandbox-Id'), null);
    assert.equal(businessCalls[0].headers.get('X-Sandbox-Secret-Key'), null);
    clearCliToken(host);
  });

  await test('agent HTTP 401 clears the CLI token and retries exactly once', async () => {
    const host = 'http://agent-retry.local';
    seedSession(host, 'cli-agent-old');
    const businessCalls: FetchCall[] = [];
    const authCalls: string[] = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const pathname = authPath(url);
      if (pathname) {
        authCalls.push(pathname);
        if (pathname.endsWith('/generate')) {
          return new Response(
            JSON.stringify({ return_code: 0, data: { userSecret: 'cli-agent-new' } }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
      }

      businessCalls.push({ url, headers: new Headers(init?.headers) });
      if (businessCalls.length === 1) {
        return new Response(
          JSON.stringify({ error: 'CLI token expired', code: 'cli_token_invalid' }),
          { status: 401 },
        );
      }
      return new Response(JSON.stringify({ agents: [] }), { status: 200 });
    }) as typeof fetch;

    await getFromMainApp('/api/sandbox/agent/agents', host);

    assert.equal(businessCalls.length, 2);
    assert.equal(businessCalls[0].headers.get('cli-token'), 'cli-agent-old');
    assert.equal(businessCalls[1].headers.get('cli-token'), 'cli-agent-new');
    assert.equal(authCalls.filter((pathname) => pathname.endsWith('/generate')).length, 1);
    clearCliToken(host);
  });

  await test('agent HTTP 403 is a permission error and never refreshes or retries', async () => {
    const host = 'http://agent-forbidden.local';
    seedSession(host, 'cli-agent-forbidden');
    const businessCalls: FetchCall[] = [];
    const authCalls: string[] = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const pathname = authPath(url);
      if (pathname) {
        authCalls.push(pathname);
        return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
      }
      businessCalls.push({ url, headers: new Headers(init?.headers) });
      return new Response(
        JSON.stringify({
          error: 'Agent administrator role is required',
          code: 'agent_admin_required',
          hint: 'Ask an administrator to grant the required role.',
        }),
        { status: 403 },
      );
    }) as typeof fetch;

    await assert.rejects(
      () => getFromMainApp('/api/sandbox/agent/agents', host),
      (error: unknown) => error instanceof PermissionError
        && error.code === 'agent_admin_required'
        && error.hint === 'Ask an administrator to grant the required role.',
    );

    assert.equal(businessCalls.length, 1);
    assert.deepEqual(
      authCalls,
      ['/v1/ta/cli/token/renew'],
      'the 403 response must not trigger an additional token refresh request',
    );
    clearCliToken(host);
  });

  await test('agent network errors retain the safe target origin and socket cause', async () => {
    const host = 'http://127.0.0.1:3000';
    seedSession(host, 'cli-agent-network');

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (authPath(url)) {
        return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
      }
      const cause = Object.assign(new Error('connect ECONNREFUSED'), {
        code: 'ECONNREFUSED',
        address: '127.0.0.1',
        port: 3000,
      });
      throw new TypeError('fetch failed', { cause });
    }) as typeof fetch;

    await assert.rejects(
      () => getFromMainApp('/api/sandbox/agent/agents?secret=must-not-leak', host),
      (error: unknown) => error instanceof TeAgentApiError
        && error.code === 'NETWORK_ERROR'
        && error.message.includes('http://127.0.0.1:3000')
        && error.message.includes('ECONNREFUSED')
        && !error.message.includes('must-not-leak'),
    );
    clearCliToken(host);
  });
} finally {
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(tempRoot, { recursive: true, force: true });
}

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
