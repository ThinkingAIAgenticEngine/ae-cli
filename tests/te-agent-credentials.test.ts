/**
 * te-agent 内部鉴权凭证单测
 *
 * 运行方式：
 *   npx tsx tests/te-agent-credentials.test.ts
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type EnvPatch = Record<string, string | undefined>;

let pass = 0;
let fail = 0;

async function loadCredentialsModule() {
  return (await import(
    `../src/core/te-agent-credentials.ts?ts=${Date.now()}-${Math.random()}`
  )) as typeof import('../src/core/te-agent-credentials.ts');
}

async function loadClientModule() {
  return (await import(
    `../src/core/te-agent-client.ts?ts=${Date.now()}-${Math.random()}`
  )) as typeof import('../src/core/te-agent-client.ts');
}

async function withEnv<T>(env: EnvPatch, fn: () => T | Promise<T>): Promise<T> {
  const prev: EnvPatch = {};
  for (const key of Object.keys(env)) {
    prev[key] = process.env[key];
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

const tmpRoot = mkdtempSync(join(tmpdir(), 'ae-cli-te-agent-credentials-'));
process.stdout.write(`tmp: ${tmpRoot}\n`);

try {
  await test('仅 env 即可生成 sandbox 内部鉴权凭证', async () => {
    await withEnv(
      {
        HOME: join(tmpRoot, 'env-only-home'),
        TE_CLAUDE_BASE_URL: 'http://te-claude.local',
        SANDBOX_ID: 'sb-env',
        SECRET_KEY: 'secret-env',
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        const { loadTeAgentCredentials } = await loadCredentialsModule();
        assert.deepEqual(loadTeAgentCredentials(), {
          mainApp: {
            url: 'http://te-claude.local',
            sandboxId: 'sb-env',
            sandboxSecretKey: 'secret-env',
          },
        });
      },
    );
  });

  await test('credentials.json 可作为老镜像兜底', async () => {
    const home = join(tmpRoot, 'legacy-home');
    mkdirSync(join(home, '.te-agent'), { recursive: true });
    writeFileSync(
      join(home, '.te-agent', 'credentials.json'),
      JSON.stringify({
        mainApp: {
          url: 'http://legacy.local',
          sandboxId: 'sb-file',
          sandboxSecretKey: 'secret-file',
        },
      }),
    );

    await withEnv(
      {
        HOME: home,
        SANDBOX_RUNTIME_ROOT: join(tmpRoot, 'legacy-runtime-empty'),
        TE_CLAUDE_BASE_URL: undefined,
        SANDBOX_ID: undefined,
        SECRET_KEY: undefined,
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        const { loadTeAgentCredentials } = await loadCredentialsModule();
        const cred = loadTeAgentCredentials();
        assert.equal(cred.mainApp.url, 'http://legacy.local');
        assert.equal(cred.mainApp.sandboxId, 'sb-file');
        assert.equal(cred.mainApp.sandboxSecretKey, 'secret-file');
      },
    );
  });

  await test('持久化 .env 提供 SANDBOX_ID / SECRET_KEY', async () => {
    const runtimeRoot = join(tmpRoot, 'persistent-env-home');
    mkdirSync(runtimeRoot, { recursive: true });
    writeFileSync(
      join(runtimeRoot, '.env'),
      'SANDBOX_ID=aaaaaaa\nSECRET_KEY=xxxxxxxx\n',
    );

    await withEnv(
      {
        HOME: join(tmpRoot, 'persistent-env-cli-home'),
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
        TE_CLAUDE_BASE_URL: 'http://te-claude.local',
        SANDBOX_ID: undefined,
        SECRET_KEY: undefined,
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        const { loadTeAgentCredentials } = await loadCredentialsModule();
        assert.deepEqual(loadTeAgentCredentials(), {
          mainApp: {
            url: 'http://te-claude.local',
            sandboxId: 'aaaaaaa',
            sandboxSecretKey: 'xxxxxxxx',
          },
        });
      },
    );
  });

  await test('.env 覆盖 credentials.json，env 覆盖 .env', async () => {
    const home = join(tmpRoot, 'env-priority-home');
    const runtimeRoot = join(tmpRoot, 'env-priority-runtime');
    mkdirSync(join(home, '.te-agent'), { recursive: true });
    mkdirSync(runtimeRoot, { recursive: true });
    writeFileSync(
      join(home, '.te-agent', 'credentials.json'),
      JSON.stringify({
        mainApp: {
          url: 'http://legacy.local',
          sandboxId: 'sb-file',
          sandboxSecretKey: 'secret-file',
        },
      }),
    );
    writeFileSync(
      join(runtimeRoot, '.env'),
      'SANDBOX_ID=sb-dotenv\nSECRET_KEY=secret-dotenv\nTE_CLAUDE_BASE_URL=http://dotenv.local\n',
    );

    await withEnv(
      {
        HOME: home,
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
        TE_CLAUDE_BASE_URL: undefined,
        SANDBOX_ID: undefined,
        SECRET_KEY: undefined,
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        const { loadTeAgentCredentials } = await loadCredentialsModule();
        assert.deepEqual(loadTeAgentCredentials(), {
          mainApp: {
            url: 'http://dotenv.local',
            sandboxId: 'sb-dotenv',
            sandboxSecretKey: 'secret-dotenv',
          },
        });
      },
    );

    await withEnv(
      {
        HOME: home,
        SANDBOX_RUNTIME_ROOT: runtimeRoot,
        TE_CLAUDE_BASE_URL: 'http://env.local',
        SANDBOX_ID: 'sb-env',
        SECRET_KEY: 'secret-env',
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        const { loadTeAgentCredentials } = await loadCredentialsModule();
        assert.deepEqual(loadTeAgentCredentials(), {
          mainApp: {
            url: 'http://env.local',
            sandboxId: 'sb-env',
            sandboxSecretKey: 'secret-env',
          },
        });
      },
    );
  });

  await test('env 覆盖 credentials.json', async () => {
    const home = join(tmpRoot, 'override-home');
    mkdirSync(join(home, '.te-agent'), { recursive: true });
    writeFileSync(
      join(home, '.te-agent', 'credentials.json'),
      JSON.stringify({
        mainApp: {
          url: 'http://legacy.local',
          sandboxId: 'sb-file',
          sandboxSecretKey: 'secret-file',
        },
      }),
    );

    await withEnv(
      {
        HOME: home,
        SANDBOX_RUNTIME_ROOT: join(tmpRoot, 'override-runtime-empty'),
        TE_CLAUDE_BASE_URL: 'http://env.local',
        SANDBOX_ID: 'sb-env',
        SECRET_KEY: 'secret-env',
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        const { loadTeAgentCredentials } = await loadCredentialsModule();
        assert.deepEqual(loadTeAgentCredentials(), {
          mainApp: {
            url: 'http://env.local',
            sandboxId: 'sb-env',
            sandboxSecretKey: 'secret-env',
          },
        });
      },
    );
  });

  await test('model/sync client 均发送 X-Sandbox-Id + X-Sandbox-Secret-Key', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      if (String(url).endsWith('/api/sandbox/models')) {
        return new Response(JSON.stringify({ models: [] }), { status: 200 });
      }
      if (String(url).includes('/api/sandbox/sync/pull/candidates')) {
        return new Response(
          JSON.stringify({
            workspace: { id: 'wp-id', path: 'wqa13' },
            skills: [],
            mcp: [],
          }),
          { status: 200 },
        );
      }
      if (String(url).endsWith('/api/sandbox/sync/pull')) {
        return new Response(
          JSON.stringify({
            workspace: { id: 'wp-id', path: 'wqa13' },
            results: [],
          }),
          { status: 200 },
        );
      }
      if (String(url).endsWith('/api/sandbox/models/select')) {
        return new Response(
          JSON.stringify({
            workspace: { id: 'wp-id', path: 'wqa13' },
            model: { id: 'model-cuid-2', name: 'AE Auto', modelId: 'AE-Auto', scope: 'system' },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ apiKey: '', baseUrl: 'https://model.example.com', modelId: 'm1' }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      await withEnv(
        {
          HOME: join(tmpRoot, 'client-home'),
          TE_CLAUDE_BASE_URL: 'http://te-claude.local',
          SANDBOX_ID: 'sb-client',
          SECRET_KEY: 'secret-client',
          SANDBOX_SECRET_KEY: undefined,
        },
        async () => {
          const {
            getSandboxModels,
            postSandboxModelSelection,
            getSandboxSyncPullCandidates,
            postSandboxSyncPull,
          } = await loadClientModule();
          await getSandboxModels();
          await postSandboxModelSelection({ workspacePath: 'wqa13', modelId: 'model-cuid-2' });
          await getSandboxSyncPullCandidates({ workspacePath: 'wqa13', kind: 'both' });
          await postSandboxSyncPull({ workspacePath: 'wqa13', kind: 'both', skills: [], mcp: [] });
        },
      );
    } finally {
      globalThis.fetch = prevFetch;
    }

    assert.equal(calls.length, 4);
    for (const call of calls) {
      const headers = call.init.headers as Record<string, string>;
      assert.equal(headers['X-Sandbox-Id'], 'sb-client');
      assert.equal(headers['X-Sandbox-Secret-Key'], 'secret-client');
    }
    assert.equal(calls[0].url, 'http://te-claude.local/api/sandbox/models');
    assert.equal(calls[1].url, 'http://te-claude.local/api/sandbox/models/select');
    assert.equal((calls[1].init.headers as Record<string, string>)['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
      workspacePath: 'wqa13',
      modelId: 'model-cuid-2',
    });
    assert.equal(
      calls[2].url,
      'http://te-claude.local/api/sandbox/sync/pull/candidates?workspacePath=wqa13&kind=both',
    );
    assert.equal(calls[3].url, 'http://te-claude.local/api/sandbox/sync/pull');
    assert.equal((calls[3].init.headers as Record<string, string>)['Content-Type'], 'application/json');
  });
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
