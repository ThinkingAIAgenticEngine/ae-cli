import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { getAgentContext } from '../src/commands/te-agent/agent-context.ts';
import { getSkillContent } from '../src/commands/te-agent/skill-content.ts';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

const host = 'https://agent-context-test.invalid';
const context = (id: string, includeCredentials = false) => ({ str: () => id, host: () => host, bool: () => includeCredentials }) as RuntimeContext;
const originalFetch = globalThis.fetch;
const originalBase = process.env.TE_CLAUDE_BASE_PATH;
const originalPrefix = process.env.AE_API_PREFIX;
const fixture = {
  schema_version: 1, context_version: 'metadata-version',
  agent: { id: 'agent-1', instructions: 'Analyze local files' },
  dependencies: { skills: [{ reference_id: 'missing', availability: 'unavailable' }], mcps: [] },
};
try {
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;
  setCliTokenManual('cli_context_fixture', host);
  const requests: Array<{ url: string; headers: Headers; method: string }> = [];
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('/v1/ta/cli/token/')) return new Response(JSON.stringify({ return_code: 0 }));
    requests.push({ url: String(url), headers: new Headers(init?.headers), method: init?.method ?? 'GET' });
    return new Response(JSON.stringify({ ok: true, data: fixture }));
  }) as typeof fetch;
  const ctx = context('agent/with space');
  await getAgentContext.validate?.(ctx);
  assert.equal(getAgentContext.risk, 'read');
  const expectedUrl = `${host}/agent/api/cli/agent/v1/agents/agent%2Fwith%20space/context`;
  assert.deepEqual(await getAgentContext.dryRun?.(ctx), { method: 'GET', url: expectedUrl });
  assert.equal(requests.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(await getAgentContext.execute(ctx))), fixture);
  assert.equal(requests[0].url, expectedUrl);
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].headers.get('cli-token'), 'cli_context_fixture');
  assert.equal(requests[0].headers.get('authorization'), null);
  assert.equal(requests[0].headers.get('x-sandbox-id'), null);
  const credentialCtx = context('agent-1', true);
  assert.equal((await getAgentContext.dryRun?.(credentialCtx) as { url: string }).url,
    `${host}/agent/api/cli/agent/v1/agents/agent-1/context?include_mcp_credentials=true`);
  await getAgentContext.execute(credentialCtx);
  assert.equal(requests[1].url, `${host}/agent/api/cli/agent/v1/agents/agent-1/context?include_mcp_credentials=true`);
  for (const id of ['', ' ', ' padded', 'a'.repeat(192)]) {
    assert.throws(() => getAgentContext.validate?.(context(id)), /--id/);
  }
  for (const status of [403, 404, 409, 500]) {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ ok: false, error: { code: 'context_unavailable', message: 'Unavailable' } }), { status });
    }) as typeof fetch;
    await assert.rejects(() => getAgentContext.execute(ctx));
    assert.equal(calls, 1, 'No fallback or repeated resource requests');
  }
  process.env.TE_CLAUDE_BASE_PATH = '/custom';
  assert.equal((await getAgentContext.dryRun?.(ctx) as { url: string }).url, expectedUrl.replace('/agent/api', '/custom/api'));
  delete process.env.TE_CLAUDE_BASE_PATH;
  process.env.AE_API_PREFIX = '/gateway';
  assert.equal((await getAgentContext.dryRun?.(ctx) as { url: string }).url, expectedUrl.replace('/agent/api', '/gateway/api'));
  delete process.env.AE_API_PREFIX;
  for (const config of [
    { prefix: '/custom', base: undefined, path: '/custom' },
    { prefix: '/ignored', base: 'nested/agent/', path: '/nested/agent' },
    { prefix: '/ignored', base: '', path: '' },
    { prefix: '/', base: undefined, path: '' },
    { prefix: undefined, base: undefined, path: '/agent' },
  ]) {
    if (config.base === undefined) delete process.env.TE_CLAUDE_BASE_PATH;
    else process.env.TE_CLAUDE_BASE_PATH = config.base;
    if (config.prefix === undefined) delete process.env.AE_API_PREFIX;
    else process.env.AE_API_PREFIX = config.prefix;
    requests.length = 0;
    globalThis.fetch = (async (url, init) => {
      if (String(url).includes('/v1/ta/cli/token/')) return new Response(JSON.stringify({ return_code: 0 }));
      requests.push({ url: String(url), headers: new Headers(init?.headers), method: init?.method ?? 'GET' });
      return new Response(JSON.stringify(String(url).endsWith('/context')
        ? { ok: true, data: fixture }
        : { item: { content: '# Local skill' } }));
    }) as typeof fetch;
    await getAgentContext.execute(context('agent-1'));
    assert.deepEqual(await getSkillContent.execute(context('skill-1')), { item: { content: '# Local skill' } });
    assert.deepEqual(requests.map(({ url }) => url), [
      `${host}${config.path}/api/cli/agent/v1/agents/agent-1/context`,
      `${host}${config.path}/api/sandbox/agent/skills/skill-1/content`,
    ]);
    assert.ok(requests.every(({ headers }) => headers.get('cli-token') === 'cli_context_fixture'));
  }
  for (const args of [
    ['agent', '+get-agent-context', '--help'],
    ['agent', '+get-agent-context', '--id', 'agent-1', '--host', host, '--dry-run'],
  ]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], { encoding: 'utf8', timeout: 30_000, env: { ...process.env, NO_UPDATE_NOTIFIER: '1' } });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.doesNotMatch(result.stdout, /cli_context_fixture/);
    if (args.includes('--help')) assert.match(result.stdout, /--id/);
    else assert.match(result.stdout, /agents\/agent-1\/context/);
  }
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
  if (originalBase === undefined) delete process.env.TE_CLAUDE_BASE_PATH;
  else process.env.TE_CLAUDE_BASE_PATH = originalBase;
  if (originalPrefix === undefined) delete process.env.AE_API_PREFIX;
  else process.env.AE_API_PREFIX = originalPrefix;
}
console.log('Agent context command tests passed');
