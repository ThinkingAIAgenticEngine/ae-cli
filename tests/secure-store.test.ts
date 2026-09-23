/** CLI-token account vault, legacy migration, and downgrade interoperability tests. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  activateCredential,
  clear,
  clearAllCredentials,
  getActiveCredential,
  listCredentials,
  load,
  loadCliToken,
  loadCredentialVault,
  markCredentialRenewed,
  removeActiveCredential,
  save,
  saveCredential,
  SecureStoreAuthError,
  CredentialStoreUnreadableError,
  updateCredentialMetadata,
} from '../src/core/secure-store.ts';
import { getConfigDir } from '../src/core/config.ts';

let passed = 0;
let failed = 0;
let sequence = 0;
const hosts: string[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`  ✗ ${name}\n    ${error instanceof Error ? error.stack : String(error)}\n`);
  }
}

function host(label: string): string {
  const value = `https://vault-${label}-${process.pid}-${Date.now()}-${sequence++}.internal`;
  hosts.push(value);
  return value;
}

function pathsFor(value: string) {
  const safe = value.replace(/\/+$/, '').replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = path.join(getConfigDir(), 'secure-tokens');
  return {
    dir,
    legacy: path.join(dir, `${safe}.enc.json`),
    vault: path.join(dir, `${safe}.accounts.v1.enc.json`),
  };
}

const accountA = { openId: 'open-a', loginName: 'alice', userName: 'Alice' };
const accountB = { openId: 'open-b', loginName: 'bob', userName: 'Bob' };

process.stdout.write('\nsecure-store V1 tests\n');

try {
  await test('legacy encrypted payload still round-trips for old CLI compatibility', () => {
    const value = host('legacy-roundtrip');
    const payload = { accessToken: 'old-access', refreshToken: 'old-refresh', accessExpiresAt: '2026-01-01T00:00:00.000Z', cliToken: 'cli_old' };
    save(value, payload);
    const loaded = load(value)!;
    assert.equal(loaded.accessToken, payload.accessToken);
    assert.equal(loaded.refreshToken, payload.refreshToken);
    assert.equal(loaded.accessExpiresAt, payload.accessExpiresAt);
    assert.equal(loaded.cliToken, payload.cliToken);
  });

  await test('new credential writes V1 vault plus exact CLI-token-only legacy projection', () => {
    const value = host('dual-write');
    saveCredential(value, { cliToken: 'cli_a', account: accountA, cliTokenExpiresAt: '2026-09-20T00:00:00.000Z' });
    const legacy = load(value)!;
    assert.equal(legacy.accessToken, '');
    assert.equal(legacy.refreshToken, '');
    assert.equal(legacy.accessExpiresAt, '1970-01-01T00:00:00.000Z');
    assert.equal(legacy.cliToken, 'cli_a');
    const vault = loadCredentialVault(value)!;
    assert.equal(vault.version, 1);
    assert.equal(vault.host, value);
    assert.equal(vault.credentials.length, 1);
    assert.equal(vault.credentials[0].account?.openId, accountA.openId);
    assert.equal(vault.credentials[0].account?.loginName, accountA.loginName);
    assert.equal(vault.credentials[0].account?.userName, accountA.userName);
    assert.equal('accessToken' in vault.credentials[0], false);
    assert.equal('refreshToken' in vault.credentials[0], false);
  });

  await test('credential files use 0600 and secure directory uses 0700', () => {
    if (process.platform === 'win32') return;
    const value = host('permissions');
    saveCredential(value, { cliToken: 'cli_perms', account: accountA });
    const paths = pathsFor(value);
    assert.equal(fs.statSync(paths.dir).mode & 0o777, 0o700);
    assert.equal(fs.statSync(paths.legacy).mode & 0o777, 0o600);
    assert.equal(fs.statSync(paths.vault).mode & 0o777, 0o600);
  });

  await test('encrypted files do not contain plaintext CLI token or account names', () => {
    const value = host('ciphertext');
    saveCredential(value, { cliToken: 'cli_top_secret', account: accountA });
    const paths = pathsFor(value);
    for (const file of [paths.legacy, paths.vault]) {
      const raw = fs.readFileSync(file, 'utf8');
      assert.equal(raw.includes('cli_top_secret'), false);
      assert.equal(raw.includes('alice'), false);
    }
  });

  await test('tampered legacy ciphertext fails closed', () => {
    const value = host('tamper');
    save(value, { accessToken: '', refreshToken: '', accessExpiresAt: '1970-01-01T00:00:00.000Z', cliToken: 'cli_tamper' });
    const file = pathsFor(value).legacy;
    const blob = JSON.parse(fs.readFileSync(file, 'utf8'));
    blob.tag = `${blob.tag.startsWith('00') ? 'ff' : '00'}${blob.tag.slice(2)}`;
    fs.writeFileSync(file, JSON.stringify(blob));
    assert.throws(() => load(value), CredentialStoreUnreadableError);
  });

  await test('first new CLI run migrates an old cliToken without needing access/refresh tokens', () => {
    const value = host('migration');
    save(value, { accessToken: 'expired', refreshToken: 'expired', accessExpiresAt: '2020-01-01T00:00:00.000Z', cliToken: 'cli_migrated' });
    assert.equal(loadCliToken(value), 'cli_migrated');
    const active = getActiveCredential(value)!;
    assert.equal(active.cliToken, 'cli_migrated');
    assert.equal(active.account, undefined);
  });

  await test('auth login --add model preserves accounts and makes the new one active', () => {
    const value = host('add');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    assert.equal(listCredentials(value).length, 2);
    assert.equal(getActiveCredential(value)?.account?.loginName, 'bob');
    assert.equal(load(value)?.cliToken, 'cli_b');
  });

  await test('adding an unidentifiable account is rejected without changing existing credentials', () => {
    const value = host('anonymous-add');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    assert.throws(
      () => saveCredential(value, { cliToken: 'cli_unknown' }, { add: true }),
      (error: unknown) => error instanceof SecureStoreAuthError && error.message.includes('Upgrade the server'),
    );
    assert.deepEqual(listCredentials(value).map((entry) => entry.cliToken), ['cli_a']);
  });

  await test('ordinary login replaces host credentials to retain the simple one-host/one-user default', () => {
    const value = host('replace');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    saveCredential(value, { cliToken: 'cli_c', account: { ...accountA, userName: 'Alice New' } });
    const credentials = listCredentials(value);
    assert.equal(credentials.length, 1);
    assert.equal(credentials[0].cliToken, 'cli_c');
    assert.equal(credentials[0].account?.userName, 'Alice New');
  });

  await test('auth use switches by login_name and updates the old CLI projection', () => {
    const value = host('use-login');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    const selected = activateCredential(value, 'alice');
    assert.equal(selected.account?.openId, 'open-a');
    assert.equal(loadCliToken(value), 'cli_a');
    assert.equal(load(value)?.cliToken, 'cli_a');
  });

  await test('auth use also supports unambiguous open_id and rejects unknown account', () => {
    const value = host('use-open-id');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    assert.equal(activateCredential(value, 'open-a').account?.loginName, 'alice');
    assert.throws(() => activateCredential(value, 'nobody'), SecureStoreAuthError);
  });

  await test('successful validate enriches active account and expiration metadata', () => {
    const value = host('metadata');
    saveCredential(value, { cliToken: 'cli_unknown' });
    updateCredentialMetadata(value, 'cli_unknown', { account: accountA, cliTokenExpiresAt: '2026-09-20T00:00:00.000Z' });
    const active = getActiveCredential(value)!;
    assert.equal(active.account?.openId, accountA.openId);
    assert.equal(active.account?.loginName, accountA.loginName);
    assert.equal(active.account?.userName, accountA.userName);
    assert.equal(active.cliTokenExpiresAt, '2026-09-20T00:00:00.000Z');
  });

  await test('renew date belongs to one credential and does not leak to another account', () => {
    const value = host('renew-account');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    markCredentialRenewed(value, 'cli_a', '2026-09-05');
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    const byLogin = Object.fromEntries(listCredentials(value).map((entry) => [entry.account?.loginName, entry]));
    assert.equal(byLogin.alice.lastRenewedOn, '2026-09-05');
    assert.equal(byLogin.bob.lastRenewedOn, undefined);
  });

  await test('active logout removes one account and projects a remaining account for old CLI', () => {
    const value = host('logout-one');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    const result = removeActiveCredential(value);
    assert.equal(result.removed?.account?.loginName, 'bob');
    assert.equal(result.active?.account?.loginName, 'alice');
    assert.equal(load(value)?.cliToken, 'cli_a');
    assert.equal(listCredentials(value).length, 1);
  });

  await test('last-account logout removes both old and V1 files', () => {
    const value = host('logout-last');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    removeActiveCredential(value);
    const paths = pathsFor(value);
    assert.equal(fs.existsSync(paths.legacy), false);
    assert.equal(fs.existsSync(paths.vault), false);
    assert.equal(loadCliToken(value), null);
  });

  await test('auth logout --all model removes every account and both files', () => {
    const value = host('logout-all');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    clearAllCredentials(value);
    assert.deepEqual(listCredentials(value), []);
    assert.equal(load(value), null);
  });

  await test('old CLI login/token change is imported and selected after upgrading again', () => {
    const value = host('old-login');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    save(value, { accessToken: 'old-access', refreshToken: 'old-refresh', accessExpiresAt: '2026-09-06T00:00:00.000Z', cliToken: 'cli_from_old_cli' });
    assert.equal(loadCliToken(value), 'cli_from_old_cli');
    assert.equal(listCredentials(value).length, 3);
    assert.equal(getActiveCredential(value)?.account, undefined);
  });

  await test('old CLI account switch to a known projected token selects it without duplication', () => {
    const value = host('old-switch');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    save(value, { accessToken: '', refreshToken: '', accessExpiresAt: '1970-01-01T00:00:00.000Z', cliToken: 'cli_a' });
    assert.equal(getActiveCredential(value)?.account?.loginName, 'alice');
    assert.equal(listCredentials(value).length, 2);
  });

  await test('old CLI logout removes only its projected account and preserves other new accounts', () => {
    const value = host('old-logout');
    saveCredential(value, { cliToken: 'cli_a', account: accountA });
    saveCredential(value, { cliToken: 'cli_b', account: accountB }, { add: true });
    clear(value);
    const vault = loadCredentialVault(value)!;
    assert.deepEqual(vault.credentials.map((entry) => entry.account?.loginName), ['alice']);
    assert.equal(load(value)?.cliToken, 'cli_a');
  });

  await test('trailing slash and normalized host share one credential vault', () => {
    const value = `${host('normalize')}/`;
    saveCredential(value, { cliToken: 'cli_normalized', account: accountA });
    assert.equal(loadCliToken(value.replace(/\/$/, '')), 'cli_normalized');
  });

  await test('atomic writes leave no plaintext or temporary credential files behind', () => {
    const value = host('atomic');
    saveCredential(value, { cliToken: 'cli_atomic', account: accountA });
    const paths = pathsFor(value);
    const leftovers = fs.readdirSync(paths.dir).filter((name) => name.includes('.tmp'));
    assert.deepEqual(leftovers, []);
  });
} finally {
  for (const value of hosts) clearAllCredentials(value);
}

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
