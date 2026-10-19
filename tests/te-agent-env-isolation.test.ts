import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { RuntimeContext } from '../src/framework/types.js';

// Use an isolated process environment before importing config/secure-store singletons.
const root = fs.mkdtempSync(join(tmpdir(), 'ae-cli-env-isolation-'));
const originalEnv = { ...process.env };
process.env.HOME = join(root, 'home');
process.env.SANDBOX_RUNTIME_ROOT = join(root, 'runtime');
for (const key of ['TE_CLAUDE_BASE_URL', 'SANDBOX_ID', 'SECRET_KEY', 'SANDBOX_SECRET_KEY',
  'TE_AGENT_PAGE_CONTEXT_MCP_URL', 'TE_AGENT_PAGE_CONTEXT_TOKEN']) delete process.env[key];
process.env.TE_AGENT_CONVERSATION_ID = 'conversation-fixture';
const host = 'https://env-isolation.invalid';
const runtime = process.env.SANDBOX_RUNTIME_ROOT;
fs.mkdirSync(join(runtime, '.ae-config'), { recursive: true });
fs.writeFileSync(join(runtime, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'cli-fixture' }));
const credentials = await import('../src/core/te-agent-credentials.js');
const client = await import('../src/core/te-agent-client.js');
const { listSkills } = await import('../src/commands/te-agent/skills.js');
const { editSkill } = await import('../src/commands/te-agent/skill-content.js');
const { npmInstallSandboxTool } = await import('../src/commands/te-system/sandbox-tools.js');
const { listMemberCandidates } = await import('../src/commands/te-system/members.js');
const { getMemoryCli } = await import('../src/commands/memory/cli-client.js');
const { listWorkspaces } = await import('../src/commands/workspace/index.js');
const { automationCommands } = await import('../src/commands/automation/index.js');
const { currentPageContext } = await import('../src/commands/context/current.js');

const ctx = {
  host: () => host, hostOverride: () => undefined,
  str: (key: string) => (({ id: 'skill-fixture', instructions: 'Updated fixture', version: '1.1', scope: 'personal' } as Record<string, string>)[key] ?? ''),
  bool: () => false, num: () => 0, optionalNum: () => undefined, json: () => undefined,
  list: () => [], out: async () => {},
} as unknown as RuntimeContext;

test('isolated sandbox credentials never block CLI-token commands', async (t) => {
  const originalRead = fs.readFileSync;
  const originalFetch = globalThis.fetch;
  let deniedReads = 0;
  const calls: Array<{ url: string; headers: Headers; method: string; body: unknown }> = [];
  let status = 200;
  fs.readFileSync = ((file: any, ...args: any[]) => {
    const path = String(file);
    if (path === join(runtime, '.env') || path === join(process.env.HOME!, '.te-agent', 'credentials.json')) {
      deniedReads++;
      throw Object.assign(new Error('Fixture credentials are denied'), { code: 'EACCES' });
    }
    return (originalRead as any)(file, ...args);
  }) as typeof fs.readFileSync;
  syncBuiltinESMExports();
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes('/v1/ta/cli/token/')) return new Response('{"return_code":0}', { status: 200 });
    calls.push({ url, headers: new Headers(init?.headers), method: init?.method ?? 'GET', body: init?.body });
    return new Response(JSON.stringify(status === 200 ? { ok: true, data: { items: [], accepted: true } } : { error: 'Denied' }), { status });
  }) as typeof fetch;
  try {
    const cases: Array<[string, () => Promise<unknown>]> = [
      ['agent +list-skills', () => listSkills.execute(ctx)],
      ['agent +edit-skill', () => editSkill.execute(ctx)],
      ['system +list-member-candidates', () => listMemberCandidates.execute(ctx)],
      ['memory +list transport', () => getMemoryCli(ctx, 'agent-spaces/space-fixture/memories')],
      ['workspace list', () => listWorkspaces.execute(ctx)],
      ['automation list', () => automationCommands.find(c => c.command === 'list' && !c.resource)!.execute(ctx)],
      ['context +current legacy transport', () => currentPageContext.execute(ctx)],
      ['multipart upload', () => client.uploadToMainApp('/api/sandbox/agent/skills', new FormData(), host)],
      ['PATCH', () => client.patchToMainApp('/api/fixture', {}, host)],
      ['DELETE', () => client.deleteFromMainApp('/api/fixture', host)],
    ];
    for (const [name, run] of cases) await t.test(name, async () => {
      const start = calls.length;
      await run();
      assert.ok(calls.length > start, 'must reach the business request');
      for (const call of calls.slice(start)) {
        assert.equal(call.headers.get('cli-token'), 'cli-fixture');
        assert.equal(call.headers.get('X-Sandbox-Secret-Key'), null);
        assert.equal(call.headers.get('Authorization'), null);
        assert.ok(call.url.startsWith(host + '/agent/'));
      }
      assert.equal(deniedReads, 0, 'must not even attempt legacy credential reads');
      if (name === 'agent +edit-skill') {
        assert.equal(calls.at(-1)!.method, 'PUT');
        assert.equal(JSON.parse(String(calls.at(-1)!.body)).instructions, 'Updated fixture');
      }
      if (name === 'multipart upload') assert.equal(calls.at(-1)!.headers.get('Content-Type'), null);
    });
    await t.test('401 and 403 do not fall back to sandbox authentication', async () => {
      for (status of [401, 403]) {
        const start = calls.length;
        await assert.rejects(client.getFromMainApp('/api/fixture', host));
        assert.ok(calls.length > start);
        if (status === 403) assert.equal(calls.length - start, 1);
        for (const call of calls.slice(start)) {
          assert.equal(call.headers.get('cli-token'), 'cli-fixture');
          assert.equal(call.headers.get('X-Sandbox-Secret-Key'), null);
        }
        assert.equal(deniedReads, 0);
      }
      status = 200;
    });
    await t.test('npm tool installation checks runtime without reading sandbox secrets', async () => {
      const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      status = 403; // Stop at the permission check, before installing any package.
      const start = calls.length;
      try {
        await assert.rejects(npmInstallSandboxTool.execute({ ...ctx,
          str: (key: string) => key === 'package' ? 'fixture@1.0.0' : ctx.str(key),
        }), /Denied/);
        assert.equal(calls.length - start, 1);
        assert.ok(calls.at(-1)!.url.endsWith('/api/admin/sandbox-tools/upload-policy'));
        assert.equal(deniedReads, 0);
      } finally {
        Object.defineProperty(process, 'platform', platform);
        status = 200;
      }
    });
    await t.test('complete runtime credentials need no files', () => {
      process.env.TE_CLAUDE_BASE_URL = 'https://legacy.invalid';
      process.env.SANDBOX_ID = 'sandbox-fixture';
      process.env.SECRET_KEY = 'secret-fixture';
      assert.equal(credentials.loadTeAgentCredentials().mainApp.sandboxId, 'sandbox-fixture');
      assert.equal(credentials.tryLoadTeAgentSandboxCredentials()?.sandboxId, 'sandbox-fixture');
      assert.equal(deniedReads, 0);
    });
    await t.test('configured CLI-token host wins over legacy runtime secrets', async () => {
      await client.getFromMainApp('/api/fixture');
      assert.equal(calls.at(-1)!.headers.get('cli-token'), 'cli-fixture');
      assert.equal(calls.at(-1)!.headers.get('X-Sandbox-Id'), null);
      assert.equal(deniedReads, 0);
    });
    await t.test('legacy model and sync routes retain sandbox auth alongside a CLI token', async () => {
      const routes: Array<() => Promise<unknown>> = [
        () => client.getSandboxModels('model-fixture'),
        () => client.postSandboxModelSelection({ workspacePath: '/fixture', modelId: 'model-fixture' }),
        () => client.getSandboxSyncPullCandidates({ workspacePath: '/fixture', kind: 'both' }),
        () => client.postSandboxSyncPull({ workspacePath: '/fixture', kind: 'both' }),
        () => client.postToMainApp('/api/sandbox/sync/push', { kind: 'skill', items: [] }),
        () => client.uploadToMainApp('/api/sandbox/sync/push/skill', new FormData()),
      ];
      for (const run of routes) {
        await run();
        const call = calls.at(-1)!;
        assert.ok(call.url.startsWith('https://legacy.invalid/api/sandbox/'));
        assert.equal(call.headers.get('X-Sandbox-Id'), 'sandbox-fixture');
        assert.equal(call.headers.get('X-Sandbox-Secret-Key'), 'secret-fixture');
        assert.equal(call.headers.get('cli-token'), null);
        if (call.url.endsWith('/push/skill')) assert.equal(call.headers.get('Content-Type'), null);
      }
      assert.equal(deniedReads, 0);
    });
    await t.test('Linux tool installation accepts legacy env and HOME token layouts', async () => {
      const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
      const tokenDir = join(process.env.HOME!, '.ae-config');
      fs.mkdirSync(tokenDir, { recursive: true });
      fs.writeFileSync(join(tokenDir, 'cli-token.json'), JSON.stringify({ url: host, token: 'cli-fixture' }));
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      delete process.env.SANDBOX_RUNTIME_ROOT;
      status = 403;
      try {
        for (const withLegacyEnv of [true, false]) {
          if (!withLegacyEnv) delete process.env.SECRET_KEY;
          const start = calls.length;
          await assert.rejects(npmInstallSandboxTool.execute({ ...ctx,
            str: (key: string) => key === 'package' ? 'fixture@1.0.0' : ctx.str(key),
          }), /Denied/);
          assert.equal(calls.length - start, 1);
          assert.ok(calls.at(-1)!.url.endsWith('/api/admin/sandbox-tools/upload-policy'));
          assert.equal(calls.at(-1)!.headers.get('cli-token'), 'cli-fixture');
        }
        assert.equal(deniedReads, 0);
      } finally {
        Object.defineProperty(process, 'platform', platform);
        process.env.SANDBOX_RUNTIME_ROOT = runtime;
        process.env.SECRET_KEY = 'secret-fixture';
        fs.rmSync(tokenDir, { recursive: true, force: true });
        status = 200;
      }
    });
    await t.test('required legacy file errors remain visible', () => {
      delete process.env.SECRET_KEY;
      assert.throws(() => credentials.loadTeAgentCredentials(), /Fixture credentials are denied/);
    });
  } finally {
    fs.readFileSync = originalRead;
    syncBuiltinESMExports();
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
