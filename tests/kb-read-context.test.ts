import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { kbApi } from '../src/core/mcp-access.js';
import { readKbExecutionContext } from '../src/core/kb-read-context.js';

test('execution reads use only the pinned scoped credential and never follow redirects or retry common auth', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-cli-context-'));
  const saved = { ...process.env };
  const originalFetch = globalThis.fetch;
  const file = path.join(root, 'context.json');
  const credential = {
    formatVersion: 1,
    required: true,
    executionRef: 'ask:one',
    readContextId: 'context-one',
    token: 'cli_kbr_' + 'a'.repeat(43),
    origin: 'https://example.test',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const ctx = { host: () => credential.origin, str: () => '' } as never;
  try {
    process.env.AE_KB_READ_CONTEXT_REQUIRED = '1';
    process.env.AE_KB_READ_CONTEXT_FILE = file;
    let requests = 0;
    globalThis.fetch = async (_url, init) => {
      requests++;
      assert.equal(new Headers(init?.headers).get('cli-token'), credential.token);
      assert.equal(new Headers(init?.headers).get('X-KB-Read-Context'), credential.readContextId);
      assert.equal(init?.redirect, 'error');
      return Response.json({ data: { pinned: true } });
    };
    await assert.rejects(
      kbApi(ctx, 'POST', '/agent/api/external/knowledge-bases/read'),
      /KB_READ_CONTEXT_REQUIRED/,
    );
    assert.equal(requests, 0);
    fs.writeFileSync(file, JSON.stringify(credential), { mode: 0o600 });
    assert.equal(
      (await kbApi(ctx, 'POST', '/agent/api/external/knowledge-bases/read')).pinned,
      true,
    );
    await assert.rejects(
      kbApi(
        { ...ctx, host: () => 'https://other.test' } as never,
        'POST',
        '/agent/api/external/knowledge-bases/read',
      ),
      /KB_READ_CONTEXT_MISMATCH/,
    );
    await assert.rejects(
      kbApi(
        { ...ctx, str: () => 'other-context' } as never,
        'POST',
        '/agent/api/external/knowledge-bases/read',
      ),
      /KB_READ_CONTEXT_MISMATCH/,
    );
    globalThis.fetch = async () => {
      requests++;
      return Response.json({ code: 'KB_READ_CONTEXT_EXPIRED' }, { status: 401 });
    };
    const before = requests;
    await assert.rejects(
      kbApi(
        ctx,
        'POST',
        '/agent/api/external/knowledge-bases/read',
        {},
        {},
        { retryUnauthorized: true },
      ),
      /KB_READ_CONTEXT_EXPIRED/,
    );
    assert.equal(requests, before + 1);
    fs.chmodSync(file, 0o644);
    assert.throws(() => readKbExecutionContext(), /KB_READ_CONTEXT_REQUIRED/);
    fs.chmodSync(file, 0o600);
    fs.writeFileSync(
      file,
      JSON.stringify({ ...credential, expiresAt: '2000-01-01T00:00:00.000Z' }),
    );
    assert.throws(() => readKbExecutionContext(), /KB_READ_CONTEXT_EXPIRED/);
    fs.unlinkSync(file);
    fs.writeFileSync(path.join(root, 'target'), JSON.stringify(credential), { mode: 0o600 });
    fs.symlinkSync(path.join(root, 'target'), file);
    assert.throws(() => readKbExecutionContext(), /KB_READ_CONTEXT_REQUIRED/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('scoped CLI reads bypass fresh and expired disabled-business configuration and ordinary authentication', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-cli-business-context-'));
  const requests: Array<{ path: string; token: unknown; readContext: unknown }> = [];
  const server = http.createServer((request, response) => {
    requests.push({
      path: request.url!,
      token: request.headers['cli-token'],
      readContext: request.headers['x-kb-read-context'],
    });
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ data: request.url === '/agent/api/external/knowledge-bases/list'
      ? { pinned: true }
      : { businesses: { agent: false } } }));
  });
  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const host = `http://127.0.0.1:${address.port}`;
    const token = 'cli_ordinary_business_identity';
    const credential = {
      formatVersion: 1,
      required: true,
      executionRef: 'ask:business-configuration',
      readContextId: 'business-context',
      token: 'cli_kbr_' + 'b'.repeat(43),
      origin: host,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const contextFile = path.join(root, 'context.json');
    fs.writeFileSync(contextFile, JSON.stringify(credential), { mode: 0o600 });
    const configDirectory = path.join(root, '.ae-cli');
    fs.mkdirSync(configDirectory);
    const businessFile = path.join(configDirectory, 'business-config.json');
    const key = `${host}#${crypto.createHash('sha256').update(token).digest('hex')}`;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: root,
      AE_CLI_TOKEN_HOST: host,
      AE_KB_READ_CONTEXT_REQUIRED: '1',
      AE_KB_READ_CONTEXT_FILE: contextFile,
    };
    delete env.AE_CLI_TOKEN_FILE;
    delete env.TE_AGENT_CLI_CONFIG_DIR;
    delete env.AE_CLI_NO_COMPAT_CHECK;
    delete env.SANDBOX_RUNTIME_ROOT;
    for (const [age, ordinaryToken] of [[0, token], [11 * 60 * 1000, token], [11 * 60 * 1000, '']] as const) {
      const snapshot = JSON.stringify({ entries: {
        [key]: { businesses: { agent: false }, fetchedAt: Date.now() - age },
      } });
      fs.writeFileSync(businessFile, snapshot);
      requests.length = 0;
      const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', 'src/index.ts', '--host', host, 'kb', '+list'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: { ...env, AE_CLI_TOKEN: ordinaryToken },
        timeout: 20_000,
      });
      assert.deepEqual(JSON.parse(result.stdout), { ok: true, data: { pinned: true } });
      assert.equal(result.stderr, '');
      assert.deepEqual(requests, [{
        path: '/agent/api/external/knowledge-bases/list',
        token: credential.token,
        readContext: credential.readContextId,
      }]);
      assert.equal(fs.readFileSync(businessFile, 'utf8'), snapshot);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
