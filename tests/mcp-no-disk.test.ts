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
 *  6. sandbox-provisioned cli-token.json is read before minting
 *  7. secure-store cliToken wins over sandbox fallback for a different host
 *  8. mcpRequest (MCP JSON-RPC transport) sends cli-token header only
 *  9. mcpRequest: 401 clears the CLI token cache, re-mints, and retries once with refreshed headers;
 *     403 is a permission denial and is never retried
 * 10. getCliToken renews once per local day via /v1/ta/cli/token/renew; failure does not block
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
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
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
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
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
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
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
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
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

await test('mcpRequest: 403 returns structured PermissionError without clearing or retrying', async () => {
  const { callMcpTool } = await import('../src/core/mcp.ts');
  const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');
  const { PermissionError } = await import('../src/core/errors.ts');
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
  let generateCount = 0;
  const seenTokens: string[] = [];
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    const urlStr = String(url);
    const headers = init?.headers as Record<string, string> | undefined;
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
    if (urlStr.includes('/v1/ta/cli/token/generate')) {
      generateCount++;
      return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'fresh-token' } }), { status: 200 });
    }
    mcpCallCount++;
    seenTokens.push(headers?.['cli-token'] ?? '');
    return new Response(
      JSON.stringify({
        error: {
          code: 'PROJECT_CLI_DISABLED',
          message: 'CLI access is disabled for this project.',
          hint: 'Ask the project owner to enable CLI access.',
        },
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => callMcpTool(`${host}/mcp/analysis/http/analysis`, 'list_dashboards', {}, host),
      (error: Error) => {
        assert.ok(error instanceof PermissionError);
        assert.equal(error.code, 'PROJECT_CLI_DISABLED');
        assert.equal(error.hint, 'Ask the project owner to enable CLI access.');
        return true;
      },
    );
    assert.equal(mcpCallCount, 1, '403 must not retry');
    assert.equal(generateCount, 0, '403 must not re-mint a CLI token');
    assert.equal(seenTokens[0], 'stale-token', 'first attempt should use the stale cached token');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
    clear(host);
  }
});

// ── test 10: daily renew once; failure does not block; next call retries ─

await test('getCliToken renews once per local day; success skips subsequent renew', async () => {
  const {
    getCliToken,
    clearCliToken,
    setCliTokenManual,
    localRenewDate,
    _resetRenewMemoryForTest,
  } = await import('../src/core/cli-token.ts');
  const { getConfigDir } = await import('../src/core/config.ts');

  const host = 'https://test-cli-renew-ok.internal';
  clearCliToken(host);
  _resetRenewMemoryForTest();
  setCliTokenManual('cli_renew_token', host);

  let renewCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      renewCount++;
      assert.ok(urlStr.includes('cli-token=cli_renew_token'), 'renew must pass cli-token query');
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${urlStr}`);
  }) as typeof fetch;

  try {
    assert.equal(await getCliToken(host), 'cli_renew_token');
    assert.equal(await getCliToken(host), 'cli_renew_token');
    assert.equal(renewCount, 1, 'successful renew should run only once per local day');

    const renewFile = path.join(getConfigDir(), 'cli-token-renew.json');
    assert.ok(fs.existsSync(renewFile), 'renew success should persist local day marker');
    const store = JSON.parse(fs.readFileSync(renewFile, 'utf8'));
    assert.equal(store[host]?.date, localRenewDate());
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

await test('getCliToken renew state uses normalized host key (trailing slash deduped)', async () => {
  const {
    getCliToken,
    clearCliToken,
    setCliTokenManual,
    localRenewDate,
    _resetRenewMemoryForTest,
  } = await import('../src/core/cli-token.ts');
  const { getConfigDir } = await import('../src/core/config.ts');

  const hostSlash = 'https://test-cli-renew-normalize.internal/';
  const hostPlain = 'https://test-cli-renew-normalize.internal';
  clearCliToken(hostSlash);
  clearCliToken(hostPlain);
  _resetRenewMemoryForTest();
  setCliTokenManual('cli_norm_token', hostSlash);
  setCliTokenManual('cli_norm_token', hostPlain);

  let renewCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      renewCount++;
      return new Response(JSON.stringify({ return_code: 0 }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${urlStr}`);
  }) as typeof fetch;

  try {
    assert.equal(await getCliToken(hostSlash), 'cli_norm_token');
    _resetRenewMemoryForTest();
    assert.equal(await getCliToken(hostPlain), 'cli_norm_token');
    assert.equal(renewCount, 1, 'trailing-slash and plain host should share one renew marker');

    const renewFile = path.join(getConfigDir(), 'cli-token-renew.json');
    const store = JSON.parse(fs.readFileSync(renewFile, 'utf8'));
    assert.equal(store[hostPlain]?.date, localRenewDate());
    assert.equal(store[hostSlash], undefined, 'legacy trailing-slash key should not be persisted');
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(hostSlash);
    clearCliToken(hostPlain);
  }
});

await test('getCliToken renew failure does not block token return and retries next call', async () => {
  const {
    getCliToken,
    clearCliToken,
    setCliTokenManual,
    _resetRenewMemoryForTest,
  } = await import('../src/core/cli-token.ts');
  const { getConfigDir } = await import('../src/core/config.ts');

  const host = 'https://test-cli-renew-fail.internal';
  clearCliToken(host);
  _resetRenewMemoryForTest();
  setCliTokenManual('cli_renew_fail_token', host);

  let renewCount = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/ta/cli/token/renew')) {
      renewCount++;
      return new Response(JSON.stringify({ return_code: -1001, return_message: 'boom' }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${urlStr}`);
  }) as typeof fetch;

  try {
    assert.equal(await getCliToken(host), 'cli_renew_fail_token', 'renew failure must not block returning token');
    assert.equal(await getCliToken(host), 'cli_renew_fail_token');
    assert.equal(renewCount, 2, 'failed renew must not mark the day; next call retries');

    const renewFile = path.join(getConfigDir(), 'cli-token-renew.json');
    if (fs.existsSync(renewFile)) {
      const store = JSON.parse(fs.readFileSync(renewFile, 'utf8'));
      assert.equal(store[host], undefined, 'failed renew must not persist a success marker for this host');
    }
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(host);
  }
});

// ── summary ───────────────────────────────────────────────────────────────

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
