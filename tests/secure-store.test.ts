/**
 * secure-store unit tests
 *
 * Run:
 *   npx tsx tests/secure-store.test.ts
 *
 * Note: CONFIG_DIR in config.ts is evaluated and cached from process.env.HOME at module load time,
 * so tests use the real ~/.ae-cli/secure-tokens/ path, isolating data with unique test hosts
 * and cleaning up after each test.
 *
 * Coverage:
 *   1. encrypt/decrypt roundtrip
 *   2. file permissions === 0o600 (non-Windows)
 *   3. tampered ciphertext rejected (auth tag check)
 *   4. expired → triggers refresh (mock HTTP), new token stored back
 *   5. not expired → refresh not triggered
 *   6. wrong key / auth tag tampered → load() returns null (fail closed)
 *   7. clear() deletes file
 *   8. refresh network failure → SecureStoreAuthError
 *   9. refresh HTTP non-200 → SecureStoreAuthError
 *  10. refresh return_code != 0 → SecureStoreAuthError
 *  11. no stored token → getValidAccessToken throws SecureStoreAuthError
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// import modules under test (top-level import, ESM cache ok, tests isolated by unique host)
import {
  save,
  load,
  clear,
  getValidAccessToken,
  loadMcpToken,
  SecureStoreAuthError,
  _resetKeyCache,
} from '../src/core/secure-store.ts';
import { getConfigDir } from '../src/core/config.ts';

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

/** generate a unique test host to avoid concurrency/repeat-run collisions */
function testHost(suffix: string): string {
  return `https://test-secure-store-${suffix}-${Date.now()}.internal`;
}

/** get the file path (mirrors tokenFilePath logic for verification) */
function encFilePath(host: string): string {
  const safe = host.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(getConfigDir(), 'secure-tokens', `${safe}.enc.json`);
}

// ── collect files created during tests and clean up at the end ───────────

const createdHosts: string[] = [];

function trackHost(host: string): string {
  createdHosts.push(host);
  return host;
}

// ── test body ─────────────────────────────────────────────────────────────

process.stdout.write(`\nsecure-store tests  (configDir: ${getConfigDir()})\n`);

try {

  // 1. encrypt/decrypt roundtrip
  await test('encrypt/decrypt roundtrip', async () => {
    const host = trackHost(testHost('roundtrip'));
    const payload = {
      accessToken: 'access-abc',
      refreshToken: 'refresh-xyz',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
    save(host, payload);
    const loaded = load(host);
    assert.ok(loaded, 'load() should return non-null');
    assert.equal(loaded!.accessToken, payload.accessToken);
    assert.equal(loaded!.refreshToken, payload.refreshToken);
    assert.equal(loaded!.accessExpiresAt, payload.accessExpiresAt);
  });

  // 2. file permissions 0600
  await test('file permissions === 0o600', async () => {
    if (process.platform === 'win32') {
      process.stdout.write('    (skip on Windows — chmod not supported)\n');
      return;
    }
    const host = trackHost(testHost('perms'));
    save(host, {
      accessToken: 'tok',
      refreshToken: 'ref',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    const filePath = encFilePath(host);
    assert.ok(fs.existsSync(filePath), `file should exist: ${filePath}`);
    const stat = fs.statSync(filePath);
    const mode = stat.mode & 0o777;
    assert.equal(mode, 0o600, `permissions should be 0600, actual: 0${mode.toString(8)}`);
  });

  // 3. tampered ciphertext rejected
  await test('tampered ciphertext → load() returns null', async () => {
    const host = trackHost(testHost('tamper'));
    save(host, {
      accessToken: 'secret-access',
      refreshToken: 'secret-refresh',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    const filePath = encFilePath(host);
    const blob = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // flip first byte of ciphertext
    const dataHex = blob.data as string;
    blob.data = (parseInt(dataHex.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, '0') + dataHex.slice(2);
    fs.writeFileSync(filePath, JSON.stringify(blob));
    try { fs.chmodSync(filePath, 0o600); } catch {}

    const result = load(host);
    assert.equal(result, null, 'load() should return null after tampering');
  });

  // 4. expired → triggers refresh, new token stored back
  await test('access token expired → calls refresh and stores back', async () => {
    const host = trackHost(testHost('refresh'));
    save(host, {
      accessToken: 'old-access',
      refreshToken: 'good-refresh',
      accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const prevFetch = globalThis.fetch;
    let refreshCalled = false;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      refreshCalled = true;
      const urlStr = String(url);
      assert.ok(urlStr.includes('/v1/oauth/refreshForToken'), `expected refresh endpoint, actual: ${urlStr}`);
      const body = JSON.parse(init?.body as string);
      assert.equal(body.refreshToken, 'good-refresh');
      return new Response(
        JSON.stringify({
          return_code: 0,
          data: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            expiresIn: 7200,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    try {
      const token = await getValidAccessToken(host);
      assert.equal(token, 'new-access');
      assert.ok(refreshCalled, 'refresh should have been called');
      const stored = load(host);
      assert.ok(stored, 'should be loadable after refresh');
      assert.equal(stored!.accessToken, 'new-access');
      assert.equal(stored!.refreshToken, 'new-refresh');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  // 5. not expired → refresh not triggered
  await test('access token not expired → returns directly without calling refresh', async () => {
    const host = trackHost(testHost('no-refresh'));
    save(host, {
      accessToken: 'valid-access',
      refreshToken: 'valid-refresh',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const prevFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    try {
      const token = await getValidAccessToken(host);
      assert.equal(token, 'valid-access');
      assert.equal(fetchCalled, false, 'fetch should not be called');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  // 6. auth tag tampered → fail closed
  await test('auth tag tampered → load() returns null (fail closed)', async () => {
    const host = trackHost(testHost('bad-tag'));
    save(host, {
      accessToken: 'secret',
      refreshToken: 'ref',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    const filePath = encFilePath(host);
    const blob = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // tamper with auth tag
    const tagHex = blob.tag as string;
    blob.tag = (parseInt(tagHex.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, '0') + tagHex.slice(2);
    fs.writeFileSync(filePath, JSON.stringify(blob));
    try { fs.chmodSync(filePath, 0o600); } catch {}

    const result = load(host);
    assert.equal(result, null, 'load() should return null after tag tampering');
  });

  // 7. clear() deletes file
  await test('clear() deletes token file', async () => {
    const host = trackHost(testHost('clear'));
    save(host, {
      accessToken: 'tok',
      refreshToken: 'ref',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    assert.ok(load(host), 'should be loadable before clear');

    clear(host);
    assert.equal(load(host), null, 'load() should return null after clear');
    assert.equal(fs.existsSync(encFilePath(host)), false, 'file should be deleted');
  });

  // 8. refresh network failure → SecureStoreAuthError
  await test('refresh network failure → SecureStoreAuthError', async () => {
    const host = trackHost(testHost('net-fail'));
    save(host, {
      accessToken: 'old',
      refreshToken: 'ref',
      accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch;

    try {
      await assert.rejects(
        () => getValidAccessToken(host),
        (err: Error) => {
          assert.ok(err instanceof SecureStoreAuthError,
            `expected SecureStoreAuthError, actual: ${err.constructor.name}: ${err.message}`);
          return true;
        },
      );
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  // 9. refresh HTTP non-200 → SecureStoreAuthError
  await test('refresh HTTP non-200 → SecureStoreAuthError', async () => {
    const host = trackHost(testHost('http-fail'));
    save(host, {
      accessToken: 'old',
      refreshToken: 'ref',
      accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('Unauthorized', { status: 401 })) as typeof fetch;

    try {
      await assert.rejects(
        () => getValidAccessToken(host),
        (err: Error) => {
          assert.ok(err instanceof SecureStoreAuthError,
            `expected SecureStoreAuthError, actual: ${err.constructor.name}: ${err.message}`);
          return true;
        },
      );
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  // 10. refresh return_code != 0 → SecureStoreAuthError
  await test('refresh return_code != 0 → SecureStoreAuthError', async () => {
    const host = trackHost(testHost('bad-code'));
    save(host, {
      accessToken: 'old',
      refreshToken: 'ref',
      accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ return_code: -1, return_message: 'token expired' }),
        { status: 200 },
      )
    ) as typeof fetch;

    try {
      await assert.rejects(
        () => getValidAccessToken(host),
        (err: Error) => {
          assert.ok(err instanceof SecureStoreAuthError,
            `expected SecureStoreAuthError, actual: ${err.constructor.name}: ${err.message}`);
          return true;
        },
      );
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  // 11. no stored token → getValidAccessToken throws SecureStoreAuthError
  await test('no stored token → getValidAccessToken throws SecureStoreAuthError', async () => {
    const host = testHost('no-token');
    await assert.rejects(
      () => getValidAccessToken(host),
      (err: Error) => {
        assert.ok(err instanceof SecureStoreAuthError,
          `expected SecureStoreAuthError, actual: ${err.constructor.name}: ${err.message}`);
        return true;
      },
    );
  });

  // 12. mcpToken persisted and readable via loadMcpToken (F-010)
  await test('mcpToken persisted and readable via loadMcpToken', async () => {
    const host = trackHost(testHost('mcp-persist'));
    save(host, {
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      mcpToken: 'mcp_secret_123',
    });
    assert.equal(load(host)!.mcpToken, 'mcp_secret_123');
    assert.equal(loadMcpToken(host), 'mcp_secret_123');
  });

  // 13. loadMcpToken returns null when absent
  await test('loadMcpToken returns null when absent', async () => {
    const host = trackHost(testHost('mcp-absent'));
    save(host, {
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    assert.equal(loadMcpToken(host), null, 'no mcpToken field → null');
    assert.equal(loadMcpToken(testHost('never-saved')), null, 'no entry at all → null');
  });

  // 14. mcpToken preserved across an access-token refresh (F-010)
  await test('mcpToken preserved across refresh', async () => {
    const host = trackHost(testHost('mcp-refresh'));
    save(host, {
      accessToken: 'old',
      refreshToken: 'good-refresh',
      accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
      mcpToken: 'mcp_keep_me',
    });
    const prevFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ return_code: 0, data: { accessToken: 'new', refreshToken: 'nr', expiresIn: 7200 } }),
        { status: 200 },
      )
    ) as typeof fetch;
    try {
      const token = await getValidAccessToken(host);
      assert.equal(token, 'new');
      assert.equal(loadMcpToken(host), 'mcp_keep_me', 'mcpToken should survive an access-token refresh');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  // 15. past static expiry + no refresh token → returns stored token (lazy discovery, F-010), no throw
  await test('past static expiry + no refresh token → returns stored token (lazy, no throw)', async () => {
    const host = trackHost(testHost('lazy'));
    save(host, {
      accessToken: 'still-here',
      refreshToken: '',                                            // no refresh token (this env)
      accessExpiresAt: new Date(Date.now() - 1000).toISOString(),  // past the static local expiry
    });
    const prevFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (async () => { fetchCalled = true; return new Response('{}', { status: 200 }); }) as typeof fetch;
    try {
      const token = await getValidAccessToken(host);
      assert.equal(token, 'still-here', 'should return the stored token (server slides / validates lazily), not throw');
      assert.equal(fetchCalled, false, 'should NOT attempt a refresh when there is no refresh token');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

} finally {
  // clean up token files created during tests
  for (const host of createdHosts) {
    try { clear(host); } catch {}
  }
}

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
