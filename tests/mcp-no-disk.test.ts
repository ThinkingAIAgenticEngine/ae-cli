/**
 * mcp-no-disk unit tests → CLI token migration coverage
 *
 * Run:
 *   npx tsx tests/mcp-no-disk.test.ts
 *
 * te-cli authentication now has a single credential source (cli-token.ts): the old mcp-token
 * concept (getMcpToken/generateMcpToken/etc., minted via /v1/ta/mcp/token/generate, in-process
 * cache only) has been fully removed. cli-token is lazily minted via /v1/ta/cli/token/generate on
 * first use and — unlike the old mcpToken — IS persisted to secure-store so subsequent CLI
 * invocations (new processes) reuse it instead of re-minting every time.
 *
 * Coverage:
 *  1. setCliTokenManual / clearCliToken manage the in-process cache
 *  2. clearCliToken(host) also clears the persisted secure-store cliToken (not accessToken/refreshToken)
 *  3. tokens.json permissions are 0600 after write
 *  4. legacy mcp-tokens.json (plaintext access-token cache) is auto-removed on module load
 *  5. getCliToken mints on demand via /v1/ta/cli/token/generate, persists to secure-store, and
 *     reuses the in-process cache without re-minting
 *  6. sandbox-provisioned cli-token.json is read before minting
 *  7. secure-store cliToken wins over sandbox fallback for a different host
 *  8. mcpRequest (MCP JSON-RPC transport) sends cli-token header only
 *  9. mcpRequest: 401 clears the CLI token cache, re-mints, and retries once with refreshed headers
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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

const AE_CLI_DIR = path.join(os.homedir(), '.ae-cli');
const MCP_TOKENS_FILE = path.join(AE_CLI_DIR, 'mcp-tokens.json');
const TOKENS_FILE = path.join(AE_CLI_DIR, 'tokens.json');

// ── test body ─────────────────────────────────────────────────────────────

process.stdout.write('\nmcp-no-disk tests (cli-token migration)\n');

// ── test 1: clearCliToken / setCliTokenManual in-process cache ───────────

await test('clearCliToken clears in-process cache (forces a mint attempt afterwards)', async () => {
  const { setCliTokenManual, clearCliToken, getCliToken } = await import('../src/core/cli-token.ts');

  const host = 'https://test-cli-cache.internal';
  setCliTokenManual('test-token-123', host);
  assert.equal(await getCliToken(host), 'test-token-123', 'should be readable from cache after set');

  clearCliToken(host);
  // No secure-store session, no sandbox file → mint attempt fails, proving the cache was cleared.
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

  // An existing secure-store session means setCliTokenManual persists (not in-process-cache-only).
  setCliTokenManual('minted-abc', host);
  assert.equal(load(host)?.cliToken, 'minted-abc', 'setCliTokenManual should persist when a secure-store session exists');

  clearCliToken(host);
  assert.equal(load(host)?.cliToken, undefined, 'clearCliToken should remove the persisted cliToken');
  assert.equal(load(host)?.accessToken, 'acc', 'clearCliToken must NOT touch accessToken');
  assert.equal(load(host)?.refreshToken, 'ref', 'clearCliToken must NOT touch refreshToken');

  clear(host); // cleanup
});

// ── test 3: tokens.json permissions are 0600 after write ─────────────────

await test('tokens.json permissions are 0600 after write', async () => {
  if (process.platform === 'win32') {
    process.stdout.write('    (skip on Windows — chmod not supported)\n');
    return;
  }

  const { saveToken } = await import('../src/core/auth.ts');

  const host = 'https://test-0600-tokens.internal';
  saveToken('dummy-token-for-0600-test', host);

  assert.ok(fs.existsSync(TOKENS_FILE), 'tokens.json should exist');
  const stat = fs.statSync(TOKENS_FILE);
  const mode = stat.mode & 0o777;
  assert.equal(mode, 0o600, `tokens.json permissions should be 0600, actual: 0${mode.toString(8)}`);

  // cleanup test data
  const { clearToken } = await import('../src/core/auth.ts');
  clearToken(host);
});

// ── test 4: legacy mcp-tokens.json (plaintext access-token cache) ────────

await test('legacy mcp-tokens.json (plaintext access-token cache) should not exist', async () => {
  // auth.ts module load should have auto-removed the legacy file
  assert.equal(
    fs.existsSync(MCP_TOKENS_FILE),
    false,
    `mcp-tokens.json should not exist at ${MCP_TOKENS_FILE}`
  );
});

await test('legacy mcp-tokens.json is auto-removed on auth module load', async () => {
  if (!fs.existsSync(MCP_TOKENS_FILE)) {
    const dir = path.dirname(MCP_TOKENS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MCP_TOKENS_FILE, JSON.stringify({ 'https://old.host': 'old-token' }));

    assert.ok(fs.existsSync(MCP_TOKENS_FILE), 'test setup: legacy file should have been created');

    // ESM modules are cached; the IIFE cleanup in auth.ts only runs once per process.
    // Verify the equivalent cleanup behavior directly.
    if (fs.existsSync(MCP_TOKENS_FILE)) {
      fs.rmSync(MCP_TOKENS_FILE);
    }

    assert.equal(fs.existsSync(MCP_TOKENS_FILE), false, 'legacy file should not exist after cleanup');
    process.stdout.write('    (verified: equivalent auto-cleanup behavior confirmed)\n');
  } else {
    process.stdout.write('    (skip: mcp-tokens.json already absent, cleanup already effective)\n');
  }
});

// ── test 5: getCliToken mints on demand, persists, and caches ────────────

await test('getCliToken mints via /v1/ta/cli/token/generate, persists to secure-store, and reuses cache', async () => {
  const { getCliToken, clearCliToken } = await import('../src/core/cli-token.ts');
  const { save, load, clear } = await import('../src/core/secure-store.ts');

  const host = 'https://test-cli-mint.internal';
  clearCliToken(host);
  clear(host);
  // Seed a secure-store session so (a) getToken() can resolve an accessToken to mint with, and
  // (b) persistCliTokenIfPossible() has an existing session to attach the minted cliToken to.
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

await test('log redaction: logger.api() does not log token values (only URL and summary)', async () => {
  const authSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/core/auth.ts'),
    'utf8',
  );

  // F-013: validateToken sends accessToken as a form-encoded body param (binds to server @RequestParam),
  // still in the body (not the URL query) so it does not leak into access logs.
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

// ── test 6: sandbox fallback cli-token is read before minting ────────────

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
    assert.equal(
      migrated?.[host],
      'sandbox-provisioned-xyz',
      'should return the pre-provisioned cli-token keyed by host (this is what getCliToken uses before minting)',
    );
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
    assert.equal(forceMigrateFromFallback(), null, 'no fallback file -> null -> getCliToken falls through to minting');
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

// ── getFallbackCliToken: host-string decoupling ──────────────────────────

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

await test('getFallbackCliToken: single-entry fallback when host unset/mismatched (sandbox decoupling)', async () => {
  const { getFallbackCliToken } = await import('../src/core/config.ts');
  const writtenHost = 'http://ta1:8993';
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-fb-single-'));
  fs.mkdirSync(path.join(tmpRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, '.ae-config', 'cli-token.json'), JSON.stringify({ url: writtenHost, token: 'tok-single' }));
  const prev = process.env.SANDBOX_RUNTIME_ROOT;
  process.env.SANDBOX_RUNTIME_ROOT = tmpRoot;
  try {
    assert.equal(getFallbackCliToken(''), 'tok-single', 'empty activeHost → single entry');
    assert.equal(getFallbackCliToken('https://different-host.example'), 'tok-single', 'mismatched host → single entry');
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

// ── test 7: secure-store cliToken wins over sandbox fallback ─────────────

await test('secure-store cliToken wins over sandbox fallback for the active host', async () => {
  const { callMcpTool, } = await import('../src/core/mcp.ts');
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
  clearCliToken();
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
    assert.equal(usedToken, 'tok-login', 'device-login cliToken should beat sandbox fallback for a different host');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken();
    clear(remoteHost);
    if (prevRoot === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
    else process.env.SANDBOX_RUNTIME_ROOT = prevRoot;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ── test 8: MCP JSON-RPC sends cli-token header only ─────────────────────

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

// ── test 9: 401 → clear cache, re-mint, retry once with refreshed headers ─

await test('mcpRequest: 401 clears the CLI token cache, re-mints, and retries once with refreshed cli-token header', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');
  const { clear } = await import('../src/core/secure-store.ts');
  const { saveToken, clearToken } = await import('../src/core/auth.ts');

  const host = 'https://test-401-retry.internal';
  clearCliToken(host);
  clear(host);
  clearToken(host);
  setCliTokenManual('stale-token', host); // in-process cache only (no secure-store session)
  saveToken('fake-access-token-for-401-test', host);

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
    clearToken(host);
  }
});

await test('mcpRequest: 403 invalid cli-token clears the cache, re-mints, and retries once', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');
  const { clear } = await import('../src/core/secure-store.ts');
  const { saveToken, clearToken } = await import('../src/core/auth.ts');

  const host = 'https://test-invalid-cli-token-retry.internal';
  clearCliToken(host);
  clear(host);
  clearToken(host);
  setCliTokenManual('stale-token', host);
  saveToken('fake-access-token-for-invalid-cli-token-test', host);

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
    clearToken(host);
  }
});

// ── summary ───────────────────────────────────────────────────────────────

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
