/**
 * mcp-no-disk unit tests → CLI token coverage
 *
 * Run:
 *   npx tsx tests/mcp-no-disk.test.ts
 *
 * te-cli authentication uses a single CLI credential source (cli-token.ts): lazily minted via
 * /v1/ta/cli/token/generate on first use and persisted to secure-store so subsequent CLI
 * invocations (new processes) reuse it instead of re-minting every time.
 *
 * Coverage:
 *  1. setCliTokenManual / clearCliToken manage the in-process cache
 *  2. clearCliToken(host) also clears the persisted secure-store cliToken (not accessToken/refreshToken)
 *  3. getCliToken mints on demand via /v1/ta/cli/token/generate, persists to secure-store, and
 *     reuses the in-process cache without re-minting
 *  4. sandbox-provisioned cli-token.json is read before minting
 *  5. secure-store cliToken wins over sandbox fallback for a different host
 *  6. mcpRequest (MCP JSON-RPC transport) sends cli-token header only
 *  7. mcpRequest: 401/403 clears the CLI token cache, re-mints, and retries once with refreshed headers
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// ── helpers ───────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack
      ? '\n    ' + err.stack.split('\n').slice(1, 4).join('\n    ')
      : '';
    process.stdout.write(`    ${msg}${stack}\n`);
  }
}

// ── test body ─────────────────────────────────────────────────────────────

process.stdout.write('\nmcp-no-disk tests (cli-token)\n');

// ── test 1: clearCliToken / setCliTokenManual in-process cache ───────────

await test('clearCliToken clears in-process cache (forces a mint attempt afterwards)', async () => {
  const { setCliTokenManual, clearCliToken, getCliToken } = await import('../src/core/cli-token.ts');

  const host = 'https://test-cli-cache.internal';
  setCliTokenManual('test-token-123', host);
  assert.equal(await getCliToken(host), 'test-token-123', 'should be readable from cache after set');

  clearCliToken(host);
  await assert.rejects(() => getCliToken(host), 'cache miss should fall through to a (failing) mint attempt');
});

// ── test 2: clearCliToken(host) also clears the persisted copy ───────────

await test('clearCliToken(host) clears the persisted secure-store cliToken (not accessToken/refreshToken)', async () => {
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');
  const { save, load, clear } = await import('../src/core/secure-store.ts');

  const host = 'https://test-cli-clear-persist.internal';
  clear(host);
  save(host, {
    accessToken: 'acc',
    refreshToken: 'ref',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });

  setCliTokenManual('minted-abc', host);
  assert.equal(load(host)?.cliToken, 'minted-abc', 'setCliTokenManual should persist when a secure-store session exists');

  clearCliToken(host);
  assert.equal(load(host)?.cliToken, undefined, 'clearCliToken should remove the persisted cliToken');
  assert.equal(load(host)?.accessToken, 'acc', 'clearCliToken must NOT touch accessToken');
  assert.equal(load(host)?.refreshToken, 'ref', 'clearCliToken must NOT touch refreshToken');

  clear(host);
});

// ── test 3: getCliToken mints on demand, persists, and caches ────────────

await test('getCliToken mints via /v1/ta/cli/token/generate, persists to secure-store, and reuses cache', async () => {
  const { getCliToken, clearCliToken } = await import('../src/core/cli-token.ts');
  const { save, load, clear } = await import('../src/core/secure-store.ts');

  const host = 'https://test-cli-mint.internal';
  clearCliToken(host);
  clear(host);
  save(host, {
    accessToken: 'access-for-mint',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });

  let mintCallCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/ta/cli/token/generate')) {
      mintCallCount++;
      const auth = (init?.headers as Record<string, string> | undefined)?.['Authorization'];
      assert.equal(auth, 'bearer access-for-mint', 'mint request should carry the AE access token as bearer auth');
      return new Response(
        JSON.stringify({ return_code: 0, data: { userSecret: 'minted-cli-token-1' } }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected fetch: ${urlStr}`);
  }) as typeof fetch;

  try {
    const token1 = await getCliToken(host);
    assert.equal(token1, 'minted-cli-token-1', 'should return the freshly-minted token');
    assert.equal(mintCallCount, 1, 'should mint exactly once');
    assert.equal(load(host)?.cliToken, 'minted-cli-token-1', 'minted cliToken should be persisted to secure-store');

    const token2 = await getCliToken(host);
    assert.equal(token2, 'minted-cli-token-1', 'second call should reuse the in-process cache');
    assert.equal(mintCallCount, 1, 'should NOT re-mint on a subsequent call within the same process');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clear(host);
  }
});

// ── log redaction grep verification ───────────────────────────────────────

await test('log redaction: validateToken sends accessToken in form body, not URL query', async () => {
  const authSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/core/auth.ts'),
    'utf8',
  );

  assert.ok(
    authSrc.includes("method: 'POST'") &&
    authSrc.includes("'Content-Type': 'application/x-www-form-urlencoded'") &&
    authSrc.includes('new URLSearchParams({ accessToken: token })'),
    'validateToken should send accessToken as a form-encoded body param (server @RequestParam), not JSON body',
  );
  assert.ok(
    !authSrc.includes('?accessToken=') && !authSrc.includes('checkToken?accessToken'),
    'validateToken should not append token to the URL query (avoid log leak)',
  );
});

await test('osascript has been removed from the codebase (T4 verification)', async () => {
  let result = '';
  try {
    result = execFileSync(
      'grep',
      ['-r', 'osascript', 'src/', '--include=*.ts', '-l'],
      { cwd: process.cwd(), encoding: 'utf8' },
    ).trim();
  } catch {
    result = '';
  }
  const nonCommentHits = result
    .split('\n')
    .filter(Boolean)
    .filter((file) => {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      return content.split('\n').some((line) =>
        line.includes('osascript') && !line.trim().startsWith('*') && !line.trim().startsWith('//')
      );
    });
  assert.equal(nonCommentHits.length, 0, `osascript should not be called in code, found: ${nonCommentHits.join(', ')}`);
});

// ── sandbox cli-token.json fallback ──────────────────────────────────────

await test('forceMigrateFromFallback reads sandbox-provisioned cli-token via SANDBOX_RUNTIME_ROOT', async () => {
  const { forceMigrateFromFallback } = await import('../src/core/config.ts');

  const host = 'http://ta1:8993';
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-sandbox-root-'));
  const aeConfigDir = path.join(tmpRoot, '.ae-config');
  fs.mkdirSync(aeConfigDir, { recursive: true });
  fs.writeFileSync(
    path.join(aeConfigDir, 'cli-token.json'),
    JSON.stringify({ url: host, token: 'sandbox-provisioned-xyz' }),
  );

  const prevRoot = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  try {
    const migrated = forceMigrateFromFallback();
    assert.ok(migrated, 'fallback file should be read when present');
    assert.equal(migrated?.[host], 'sandbox-provisioned-xyz');
  } finally {
    if (prevRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = prevRoot;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

await test('forceMigrateFromFallback returns null when no fallback file (personal/local env)', async () => {
  const { forceMigrateFromFallback } = await import('../src/core/config.ts');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-sandbox-empty-'));
  const prevRoot = process.env.SANDBOX_RUNTIME_ROOT;
  const prevHome = process.env.HOME;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  process.env.HOME = tmpRoot;
  try {
    assert.equal(forceMigrateFromFallback(), null);
  } finally {
    if (prevRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = prevRoot;
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

await test('getActiveHost: sandbox cli-token url wins over stale config activeHost', async () => {
  const { getActiveHost } = await import('../src/core/config.ts');

  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-active-host-home-'));
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-active-host-sandbox-'));
  fs.mkdirSync(path.join(tmpHome, '.ae-cli'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpHome, '.ae-cli', 'config.json'),
    JSON.stringify({
      activeHost: 'http://stale-k8s.svc.cluster.local:8996',
      hosts: {
        'http://stale-k8s.svc.cluster.local:8996': { label: 'stale' },
      },
    }),
  );
  fs.mkdirSync(path.join(tmpRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: 'https://reachable-ae.example', token: 'sandbox-token' }),
  );

  const prevHome = process.env.HOME;
  const prevRoot = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.HOME = tmpHome;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  try {
    assert.equal(getActiveHost(), 'https://reachable-ae.example');
  } finally {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (prevRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = prevRoot;
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

await test('getFallbackCliToken: exact host match', async () => {
  const { getFallbackCliToken } = await import('../src/core/config.ts');
  const host = 'http://ta1:8993';
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-fb-exact-'));
  fs.mkdirSync(path.join(tmpRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'tok-exact' }));
  const prev = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  try {
    assert.equal(getFallbackCliToken(host), 'tok-exact');
  } finally {
    if (prev === undefined) delete process.env.SANDBOX_RUNTIME_ROOT; else process.env.SANDBOX_RUNTIME_ROOT = prev;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

await test('getFallbackCliToken: single-entry fallback when host unset/mismatched', async () => {
  const { getFallbackCliToken } = await import('../src/core/config.ts');
  const writtenHost = 'http://ta1:8993';
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-fb-single-'));
  fs.mkdirSync(path.join(tmpRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, '.ae-config', 'cli-token.json'), JSON.stringify({ url: writtenHost, token: 'tok-single' }));
  const prev = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  try {
    assert.equal(getFallbackCliToken(''), 'tok-single');
    assert.equal(getFallbackCliToken('https://different-host.example'), 'tok-single');
  } finally {
    if (prev === undefined) delete process.env.SANDBOX_RUNTIME_ROOT; else process.env.SANDBOX_RUNTIME_ROOT = prev;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

await test('getFallbackCliToken: returns null when no fallback file', async () => {
  const { getFallbackCliToken } = await import('../src/core/config.ts');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-fb-none-'));
  const prev = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  try {
    assert.equal(getFallbackCliToken('http://any'), null);
  } finally {
    if (prev === undefined) delete process.env.SANDBOX_RUNTIME_ROOT; else process.env.SANDBOX_RUNTIME_ROOT = prev;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ── secure-store cliToken wins over sandbox fallback ─────────────────────

await test('secure-store cliToken wins over sandbox fallback for a different host', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { clearCliToken } = await import('../src/core/cli-token.ts');
  const { save, clear } = await import('../src/core/secure-store.ts');

  const sandboxHost = 'http://ta1:8993';
  const remoteHost = 'https://remote-env.example';
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-fb-secure-'));
  fs.mkdirSync(path.join(tmpRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpRoot, '.ae-config', 'cli-token.json'),
    JSON.stringify({ url: sandboxHost, token: 'tok-sandbox' }),
  );

  const prevRoot = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  clearCliToken(remoteHost);
  clear(remoteHost);
  save(remoteHost, {
    accessToken: 'access-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    cliToken: 'tok-login',
  });

  let usedToken = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    usedToken = String((init?.headers as Record<string, string>)?.['cli-token'] ?? '');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [] } }), { status: 200 });
  }) as typeof fetch;

  try {
    await callMcpTool(`${remoteHost}/mcp/analysis/http/analysis`, 'list_dashboards', { projectId: 1 }, remoteHost);
    assert.equal(usedToken, 'tok-login');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(remoteHost);
    clear(remoteHost);
    if (prevRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = prevRoot;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ── test 5: secure-store cliToken is used for MCP requests ───────────────

await test('secure-store cliToken is used for MCP requests', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { clearCliToken } = await import('../src/core/cli-token.ts');
  const { save, clear } = await import('../src/core/secure-store.ts');

  const remoteHost = 'https://remote-env.example';
  clearCliToken(remoteHost);
  clear(remoteHost);
  save(remoteHost, {
    accessToken: 'access-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    cliToken: 'tok-login',
  });

  let usedToken = '';
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    usedToken = String((init?.headers as Record<string, string>)?.['cli-token'] ?? '');
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [] } }), { status: 200 });
  }) as typeof fetch;

  try {
    await callMcpTool(`${remoteHost}/mcp/analysis/http/analysis`, 'list_dashboards', { projectId: 1 }, remoteHost);
    assert.equal(usedToken, 'tok-login', 'secure-store cliToken should be sent on MCP requests');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(remoteHost);
    clear(remoteHost);
  }
});

// ── test 5: MCP JSON-RPC sends cli-token header only ─────────────────────

await test('mcpRequest sends cli-token header only (no mcp-token)', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');

  const host = 'https://test-cli-header.internal';
  clearCliToken(host);
  setCliTokenManual('cli-header-token', host);

  let capturedHeaders: Record<string, string> | undefined;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => {
    capturedHeaders = init?.headers as Record<string, string>;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [] } }), { status: 200 });
  }) as typeof fetch;

  try {
    await callMcpTool(`${host}/mcp/analysis/http/analysis`, 'list_dashboards', {}, host);
    assert.equal(capturedHeaders?.['cli-token'], 'cli-header-token', 'cli-token header should carry the token');
    assert.equal(capturedHeaders?.['mcp-token'], undefined, 'mcp-token header should not be sent');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

// ── test 6: 401/403 → clear cache, re-mint, retry once ───────────────────

await test('mcpRequest: 401 clears the CLI token cache, re-mints, and retries once with refreshed cli-token header', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');
  const { save, clear } = await import('../src/core/secure-store.ts');

  const host = 'https://test-401-retry.internal';
  clearCliToken(host);
  clear(host);
  setCliTokenManual('stale-token', host);
  save(host, {
    accessToken: 'fake-access-token-for-401-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });

  let mcpCallCount = 0;
  const seenTokens: string[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    const headers = init?.headers as Record<string, string> | undefined;
    if (urlStr.includes('/v1/ta/cli/token/generate')) {
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'fresh-token' } }), { status: 200 });
    }
    mcpCallCount++;
    seenTokens.push(headers?.['cli-token'] ?? '');
    if (mcpCallCount === 1) {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [] } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await callMcpTool(`${host}/mcp/analysis/http/analysis`, 'list_dashboards', {}, host);
    assert.equal(mcpCallCount, 2, 'should retry exactly once after a 401');
    assert.equal(seenTokens[0], 'stale-token', 'first attempt should use the stale cached token');
    assert.equal(seenTokens[1], 'fresh-token', 'retry should use the freshly re-minted token');
    assert.ok(result, 'should return a result after a successful retry');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clear(host);
  }
});

await test('mcpRequest: 403 invalid cli-token clears the cache, re-mints, and retries once', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');
  const { save, clear } = await import('../src/core/secure-store.ts');

  const host = 'https://test-invalid-cli-token-retry.internal';
  clearCliToken(host);
  clear(host);
  setCliTokenManual('stale-token', host);
  save(host, {
    accessToken: 'fake-access-token-for-invalid-cli-token-test',
    refreshToken: '',
    accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });

  let mcpCallCount = 0;
  const seenTokens: string[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    const headers = init?.headers as Record<string, string> | undefined;
    if (urlStr.includes('/v1/ta/cli/token/generate')) {
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'fresh-token' } }), { status: 200 });
    }
    mcpCallCount++;
    seenTokens.push(headers?.['cli-token'] ?? '');
    if (mcpCallCount === 1) {
      return new Response(
        JSON.stringify({ error: { code: 'PERMISSION_DENIED', message: 'Your token is invalid' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [] } }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await callMcpTool(`${host}/mcp/analysis/http/analysis`, 'list_dashboards', {}, host);
    assert.equal(mcpCallCount, 2, 'should retry exactly once after an invalid cli-token 403');
    assert.equal(seenTokens[0], 'stale-token', 'first attempt should use the stale cached token');
    assert.equal(seenTokens[1], 'fresh-token', 'retry should use the freshly re-minted token');
    assert.ok(result, 'should return a result after a successful retry');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clear(host);
  }
});

// ── summary ───────────────────────────────────────────────────────────────

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
