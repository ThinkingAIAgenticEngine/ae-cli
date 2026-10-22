import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, afterEach, test } from 'node:test';
import type { RuntimeContext } from '../src/framework/types.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const home = mkdtempSync(join(tmpdir(), 'ae-cli-agent-transport-'));
process.env.HOME = join(home, 'home');
process.env.SANDBOX_RUNTIME_ROOT = join(home, 'runtime');
for (const key of ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE',
  'TE_AGENT_CLI_CONFIG_DIR', 'TE_CLAUDE_BASE_URL', 'SANDBOX_ID', 'SECRET_KEY', 'SANDBOX_SECRET_KEY']) {
  delete process.env[key];
}

const { setCliTokenManual, localRenewDate } = await import('../src/core/cli-token.ts');
const { loadCliToken, markCredentialRenewed } = await import('../src/core/secure-store.ts');
const { getFromMainApp, TeAgentApiError } = await import('../src/core/te-agent-client.ts');
const { kbApi, getAuthHeaders } = await import('../src/core/mcp-access.ts');
const { callCapabilityApi, CapabilityGatewayError } = await import('../src/core/capability-api.ts');
const { PermissionError } = await import('../src/core/errors.ts');

const host = 'https://transport.example.test';
const token = 'cli_transport_fixture';
setCliTokenManual(token, host);
markCredentialRenewed(host, token, localRenewDate());
const ctx = { host: () => host } as RuntimeContext;
const transports = [
  {
    name: 'Agent REST', path: '/agent/api/sandbox/agent/agents',
    invoke: () => getFromMainApp('/api/sandbox/agent/agents', host),
  },
  {
    name: 'KB REST', path: '/agent/api/external/knowledge-bases/list',
    invoke: () => kbApi(ctx, 'POST', '/agent/api/external/knowledge-bases/list', {}, undefined,
      { preserveErrorMetadata: true }),
  },
  {
    name: 'Agent gateway', path: '/agent/api/cli/approval/v1/requests',
    invoke: () => callCapabilityApi(host, 'approval', 'requests', 'GET', undefined, {
      apiBaseUrl: `${host}/agent`, retryOnInvalidTokenForbidden: false,
    }),
  },
];

afterEach(() => { globalThis.fetch = originalFetch; });
after(() => {
  process.env = originalEnv;
  rmSync(home, { recursive: true, force: true });
});

test('Agent, KB and gateway calls reach their business endpoints without deployment discovery', async () => {
  const paths: string[] = [];
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    assert.ok(transports.some(transport => transport.path === path), `Unexpected request: ${path}`);
    assert.equal(new Headers(init?.headers).get('cli-token'), token);
    return Response.json({ ok: true, data: { reached: true } });
  };
  for (const transport of transports) await transport.invoke();
  assert.deepEqual(paths, transports.map(transport => transport.path));
});

test('Team stream authentication reads the CLI token without a network preflight', async () => {
  globalThis.fetch = async () => { throw new Error('Stream authentication must not send a request.'); };
  assert.deepEqual(await getAuthHeaders(ctx), { 'cli-token': token });
});

for (const transport of transports) {
  for (const failure of [403, 404, 'network'] as const) {
    test(`${transport.name} preserves its business ${failure} failure without retrying or replacing credentials`, async () => {
      const paths: string[] = [];
      const networkError = new Error('Fixture network failure');
      globalThis.fetch = async (input, init) => {
        const path = new URL(String(input)).pathname;
        paths.push(path);
        assert.equal(path, transport.path);
        assert.equal(new Headers(init?.headers).get('cli-token'), token);
        if (failure === 'network') throw networkError;
        return Response.json({ error: { message: 'Fixture rejected', code: 'FIXTURE_REJECTED' } }, { status: failure });
      };
      await assert.rejects(transport.invoke, (error: unknown) => {
        if (failure === 'network') {
          if (transport.name === 'Agent REST') {
            return error instanceof TeAgentApiError && error.code === 'NETWORK_ERROR' && error.status === 0;
          }
          return error === networkError;
        }
        assert.ok(error instanceof PermissionError || error instanceof TeAgentApiError || error instanceof CapabilityGatewayError);
        assert.equal(error.code, 'FIXTURE_REJECTED');
        if (failure === 403) return error instanceof PermissionError;
        if (error instanceof TeAgentApiError) {
          assert.equal(error.errorType, 'not_found');
          return error.status === 404;
        }
        return error instanceof CapabilityGatewayError && error.httpStatus === 404;
      });
      assert.deepEqual(paths, [transport.path]);
      assert.equal(loadCliToken(host), token);
    });
  }
}
