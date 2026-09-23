/** Real credential crypto/files with isolated OS/config dependencies; no real credentials. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import ts from 'typescript';
import { safeJsonParse } from '../src/core/json-utils.ts';
import { normalizeUrl } from '../src/core/url-utils.ts';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  fs.readFileSync(new URL('../src/core/secure-store.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText;
const uuid = '12345678-1234-1234-1234-123456789ABC';
const nativeId = `darwin:${uuid}`;
const host = 'https://credential-fixture.invalid';
const payload = { accessToken: '', refreshToken: '', accessExpiresAt: '1970-01-01T00:00:00.000Z', cliToken: 'cli_fixture' };
const alice = { openId: 'open-a', loginName: 'alice', userName: 'Alice' };
const bob = { openId: 'open-b', loginName: 'bob', userName: 'Bob' };

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-credential-env-'));
  const storeDirectory = path.join(directory, 'secure-tokens');
  const legacy = path.join(storeDirectory, 'credential-fixture.invalid.enc.json');
  const vault = path.join(storeDirectory, 'credential-fixture.invalid.accounts.v1.enc.json');
  const fallbackId = (platform = 'darwin') => `fallback:${directory}|fixture-machine|${platform}`;
  const commands: string[] = [];
  const logs: string[] = [];

  function runtime(options: {
    nativeAvailable?: boolean; platform?: string; readDenied?: string; renameFails?: boolean; renameDenied?: string;
    systemEnv?: Record<string, string>; regOnPath?: boolean;
    beforeRename?: (from: string, to: string) => void; stageDenied?: string;
  } = {}) {
    const platform = options.platform ?? 'darwin';
    const module = { exports: {} };
    const dependencies: Record<string, unknown> = {
      './config.js': { getConfigDir: () => directory },
      './logger.js': { logger: Object.fromEntries(['info', 'warn', 'error'].map(level => [level, (message: string) => logs.push(message)])) },
      './json-utils.js': { safeJsonParse },
      './url-utils.js': { normalizeUrl },
      'node:os': { homedir: () => directory, hostname: () => 'fixture-machine', platform: () => platform },
      'node:child_process': { execFileSync: (command: string, args: string[]) => {
        commands.push(command);
        // A bare ioreg cannot be found in this Agent's PATH, even when the native API works.
        if (options.nativeAvailable === false || command === 'ioreg') throw new Error('Unavailable');
        if (command === '/usr/sbin/ioreg') return `"IOPlatformUUID" = "${uuid}"`;
        if (command === 'reg' || /[\\/]System32[\\/]reg\.exe$/.test(command)) {
          if (command === 'reg' && options.regOnPath === false) throw new Error('Missing from PATH');
          assert.deepEqual(args, ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']);
          return `MachineGuid    REG_SZ    ${uuid}`;
        }
        throw new Error('Unexpected command');
      } },
      'node:fs': { ...fs,
        writeFileSync: (file: string | number, ...args: any[]) => {
          if (typeof file === 'string' && options.stageDenied && file.startsWith(`${options.stageDenied}.`)
            && file.endsWith('.tmp')) throw Object.assign(new Error('Simulated full disk'), { code: 'ENOSPC' });
          return (fs.writeFileSync as any)(file, ...args);
        },
        readFileSync: (file: string, ...args: any[]) => {
          if (file === options.readDenied) throw Object.assign(new Error('Access denied'), { code: 'EACCES' });
          if (['/etc/machine-id', '/var/lib/dbus/machine-id'].includes(file)) {
            if (options.nativeAvailable === false) throw Object.assign(new Error('Missing'), { code: 'ENOENT' });
            return uuid;
          }
          return (fs.readFileSync as any)(file, ...args);
        },
        renameSync: (from: string, to: string) => {
          options.beforeRename?.(from, to);
          if (options.renameFails) throw new Error('Simulated atomic rename failure');
          if (to === options.renameDenied) throw Object.assign(new Error('Simulated locked credential'), { code: 'EPERM' });
          fs.renameSync(from, to);
        },
      },
    };
    new Function('require', 'module', 'exports', 'process', compiled)(
      (name: string) => dependencies[name] ?? require(name), module, module.exports,
      { platform, pid: process.pid, kill: process.kill, env: options.systemEnv ?? { SystemRoot: 'C:\\Windows' } },
    );
    return module.exports as typeof import('../src/core/secure-store.ts');
  }

  // Independent historical writer/reader fixes the legacy on-disk and scrypt contract.
  function historicalKey(machineId: string) {
    return crypto.scryptSync(machineId, 'ae-cli-secure-store-v1', 32, { N: 16384, r: 8, p: 1 });
  }
  function writeOld(file: string, machineId: string, value: unknown = payload) {
    fs.mkdirSync(storeDirectory, { recursive: true });
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', historicalKey(machineId), nonce);
    const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    fs.writeFileSync(file, JSON.stringify({ nonce: nonce.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') }));
  }
  function readOld(file: string, machineId: string) {
    const blob = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(Object.keys(blob).sort(), ['data', 'nonce', 'tag']);
    const decipher = crypto.createDecipheriv('aes-256-gcm', historicalKey(machineId), Buffer.from(blob.nonce, 'hex'));
    decipher.setAuthTag(Buffer.from(blob.tag, 'hex'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(blob.data, 'hex')), decipher.final()]).toString());
  }
  const snapshot = () => Object.fromEntries(fs.readdirSync(storeDirectory).sort().map(name => [name, fs.readFileSync(path.join(storeDirectory, name), 'utf8')]));
  return { directory, legacy, vault, fallbackId, commands, logs, runtime, writeOld, readOld, snapshot,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

test('macOS PATH differences preserve native credentials and old-reader compatibility', () => {
  const f = fixture();
  try {
    f.writeOld(f.legacy, nativeId);
    const original = fs.readFileSync(f.legacy, 'utf8');
    const a = f.runtime();
    assert.equal(a.loadCliToken(host), payload.cliToken);
    assert.equal(fs.readFileSync(f.legacy, 'utf8'), original);
    const b = f.runtime();
    b.saveCredential(host, { cliToken: payload.cliToken, account: alice });
    assert.equal(a.loadCliToken(host), payload.cliToken);
    assert.equal(f.readOld(f.legacy, nativeId).cliToken, payload.cliToken);
    assert.deepEqual(new Set(f.commands), new Set(['/usr/sbin/ioreg']));
  } finally { f.cleanup(); }
});

test('historical fallback credentials remain usable when native machine ID becomes available', () => {
  const f = fixture();
  try {
    f.writeOld(f.legacy, f.fallbackId());
    const original = fs.readFileSync(f.legacy, 'utf8');
    const native = f.runtime();
    assert.equal(native.loadCliToken(host), payload.cliToken);
    assert.equal(fs.readFileSync(f.legacy, 'utf8'), original);
    assert.equal(f.readOld(f.vault, f.fallbackId()).credentials[0].cliToken, payload.cliToken);
    native.saveCredential(host, { cliToken: 'cli_alice', account: alice });
    native.saveCredential(host, { cliToken: 'cli_bob', account: bob }, { add: true });
    native.activateCredential(host, 'alice');
    native.updateCredentialMetadata(host, 'cli_alice', { cliTokenExpiresAt: '2027-01-01T00:00:00.000Z' });
    native.markCredentialRenewed(host, 'cli_alice', '2026-09-21');
    const restricted = f.runtime({ nativeAvailable: false });
    assert.equal(restricted.listCredentials(host).length, 2);
    assert.equal(restricted.getActiveCredential(host)?.lastRenewedOn, '2026-09-21');
    restricted.saveCredential(host, { cliToken: 'cli_alice', account: alice }, { add: true });
    assert.equal(f.readOld(f.legacy, f.fallbackId()).cliToken, 'cli_alice');
    assert.equal(native.loadCliToken(host), 'cli_alice');
    if (process.platform !== 'win32') {
      assert.equal(fs.statSync(f.legacy).mode & 0o777, 0o600);
      assert.equal(fs.statSync(f.vault).mode & 0o777, 0o600);
    }
    assert.equal(fs.readdirSync(path.dirname(f.legacy)).length, 2);
  } finally { f.cleanup(); }
});

test('unavailable native ID rejects reads and replacement without deleting either credential file', () => {
  const f = fixture();
  try {
    f.runtime().saveCredential(host, { cliToken: 'cli_native', account: alice });
    const before = f.snapshot();
    const restricted = f.runtime({ nativeAvailable: false });
    for (const operation of [
      () => restricted.load(host), () => restricted.loadCliToken(host),
      () => restricted.save(host, payload),
      () => restricted.saveCredential(host, { cliToken: 'cli_replacement' }),
      () => restricted.removeActiveCredential(host),
    ]) {
      assert.throws(operation, (error: any) => error.code === 'CREDENTIAL_STORE_UNREADABLE');
      assert.deepEqual(f.snapshot(), before);
    }
    assert.equal(f.runtime().loadCliToken(host), 'cli_native');
  } finally { f.cleanup(); }
});

test('mixed historical key sources stay readable without rekeying either file', () => {
  const f = fixture();
  try {
    const native = f.runtime();
    native.saveCredential(host, { cliToken: 'cli_native', account: alice });
    f.writeOld(f.legacy, f.fallbackId(), { ...payload, cliToken: 'cli_from_old_cli' });
    assert.equal(native.loadCliToken(host), 'cli_from_old_cli');
    assert.equal(native.listCredentials(host).length, 2);
    assert.equal(f.readOld(f.legacy, f.fallbackId()).cliToken, 'cli_from_old_cli');
    assert.equal(f.readOld(f.vault, nativeId).credentials.length, 2);
    const before = f.snapshot();
    assert.throws(() => f.runtime({ nativeAvailable: false }).loadCliToken(host), /Cannot read or decrypt/);
    assert.deepEqual(f.snapshot(), before);
  } finally { f.cleanup(); }
});

for (const damaged of ['legacy', 'vault'] as const) {
  test(`malformed ${damaged} cannot erase accounts, leak content, or be overwritten by login`, () => {
    const f = fixture();
    try {
      const store = f.runtime();
      store.saveCredential(host, { cliToken: 'cli_alice', account: alice });
      store.saveCredential(host, { cliToken: 'cli_bob', account: bob }, { add: true });
      fs.writeFileSync(f[damaged], '{"cliToken":"secret-must-not-appear"');
      const before = f.snapshot();
      for (const operation of [() => store.loadCliToken(host), () => store.saveCredential(host, { cliToken: 'cli_new' })]) {
        assert.throws(operation, (error: any) => error.code === 'CREDENTIAL_STORE_UNREADABLE'
          && !String(error).includes('secret-must-not-appear'));
        assert.deepEqual(f.snapshot(), before);
      }
      assert.equal(f.logs.some(line => line.includes('secret-must-not-appear')), false);
    } finally { f.cleanup(); }
  });
}

test('unreadable file permissions differ from a missing credential and preserve every account', () => {
  const f = fixture();
  try {
    const store = f.runtime();
    assert.equal(store.loadCliToken(host), null);
    store.saveCredential(host, { cliToken: 'cli_alice', account: alice });
    const before = f.snapshot();
    assert.throws(() => f.runtime({ readDenied: f.legacy }).loadCliToken(host), /Cannot read or decrypt/);
    assert.deepEqual(f.snapshot(), before);
  } finally { f.cleanup(); }
});

test('invalid decrypted vault schema fails closed instead of being replaced by legacy migration', () => {
  const f = fixture();
  try {
    const store = f.runtime();
    f.writeOld(f.legacy, nativeId);
    for (const value of [null, {}, { version: 2 }, { version: 1, credentials: [] },
      { version: 1, activeCredentialId: 'a', credentials: [{ id: 'a', cliToken: 'cli_ok' }, { id: 'broken' }] }]) {
      f.writeOld(f.vault, nativeId, value);
      const before = f.snapshot();
      assert.throws(() => store.loadCliToken(host), /Cannot read or decrypt/);
      assert.throws(() => store.saveCredential(host, { cliToken: 'cli_new' }), /Cannot read or decrypt/);
      assert.deepEqual(f.snapshot(), before);
    }
  } finally { f.cleanup(); }
});

test('a dangling legacy symlink is not interpreted as an old CLI logout', () => {
  if (process.platform === 'win32') return;
  const f = fixture();
  try {
    const store = f.runtime();
    store.saveCredential(host, { cliToken: 'cli_alice', account: alice });
    const vault = fs.readFileSync(f.vault, 'utf8');
    fs.unlinkSync(f.legacy);
    const target = path.join(f.directory, 'unavailable-credential-mount');
    fs.symlinkSync(target, f.legacy);
    assert.throws(() => store.loadCliToken(host), /Cannot read or decrypt/);
    assert.throws(() => store.saveCredential(host, { cliToken: 'cli_new' }), /Cannot read or decrypt/);
    assert.equal(fs.readFileSync(f.vault, 'utf8'), vault);
    assert.equal(fs.readlinkSync(f.legacy), target);
  } finally { f.cleanup(); }
});

test('legacy access-token-only credentials do not masquerade as an explicit logout', () => {
  const f = fixture();
  try {
    const store = f.runtime();
    store.saveCredential(host, { cliToken: 'cli_alice', account: alice });
    store.saveCredential(host, { cliToken: 'cli_bob', account: bob }, { add: true });
    f.writeOld(f.legacy, nativeId, { accessToken: 'old-access', refreshToken: 'old-refresh', accessExpiresAt: '2026-01-01T00:00:00.000Z' });
    assert.equal(store.loadCliToken(host), 'cli_bob');
    assert.equal(store.listCredentials(host).length, 2);
    fs.unlinkSync(f.legacy);
    assert.equal(store.loadCliToken(host), 'cli_alice');
    assert.equal(store.listCredentials(host).length, 1);
  } finally { f.cleanup(); }
});

test('failed atomic replacement leaves the original encrypted bytes and no temporary files', () => {
  const f = fixture();
  try {
    f.writeOld(f.legacy, nativeId);
    const before = f.snapshot();
    assert.throws(() => f.runtime({ renameFails: true }).save(host, { ...payload, cliToken: 'cli_new' }), /rename failure/);
    assert.deepEqual(f.snapshot(), before);
  } finally { f.cleanup(); }
});

for (const locked of ['vault', 'legacy'] as const) {
  test(`failed save with locked ${locked} preserves both files and the active account on a fresh read`, () => {
    const f = fixture();
    try {
      f.runtime().saveCredential(host, { cliToken: 'cli_original', account: alice });
      const before = f.snapshot();
      assert.throws(() => f.runtime({ renameDenied: f[locked] }).saveCredential(host, {
        cliToken: 'cli_failed_attempt', account: bob,
      }), (error: any) => error.code === 'EPERM');
      assert.deepEqual(f.snapshot(), before);
      const reader = f.runtime();
      assert.equal(reader.loadCliToken(host), 'cli_original');
      assert.equal(reader.getActiveCredential(host)?.account?.loginName, 'alice');
      assert.equal(reader.listCredentials(host).length, 1);
      assert.deepEqual(f.snapshot(), before);
    } finally { f.cleanup(); }
  });
}

test('failed first save cannot leave a legacy token that a later read imports', () => {
  const f = fixture();
  try {
    assert.throws(() => f.runtime({ renameDenied: f.vault }).saveCredential(host, {
      cliToken: 'cli_failed_attempt', account: alice,
    }), (error: any) => error.code === 'EPERM');
    assert.deepEqual(f.snapshot(), {});
    assert.equal(f.runtime().loadCliToken(host), null);
  } finally { f.cleanup(); }
});

for (const operation of ['add', 'activate', 'remove-active'] as const) {
  for (const locked of ['legacy', 'vault'] as const) {
    test(`failed ${operation} with locked ${locked} preserves every account and the projection`, () => {
      const f = fixture();
      try {
        const store = f.runtime();
        store.saveCredential(host, { cliToken: 'cli_alice', account: alice });
        store.saveCredential(host, { cliToken: 'cli_bob', account: bob }, { add: true });
        const accounts = store.listCredentials(host);
        const before = f.snapshot();
        const failing = f.runtime({ renameDenied: f[locked] });
        assert.throws(() => {
          if (operation === 'add') failing.saveCredential(host, { cliToken: 'cli_failed_attempt', account: alice }, { add: true });
          else if (operation === 'activate') failing.activateCredential(host, 'alice');
          else failing.removeActiveCredential(host);
        }, (error: any) => error.code === 'EPERM');
        assert.deepEqual(f.snapshot(), before);
        const reader = f.runtime();
        assert.deepEqual(reader.listCredentials(host), accounts);
        assert.equal(reader.getActiveCredential(host)?.account?.loginName, 'bob');
        assert.equal(reader.loadCliToken(host), 'cli_bob');
        assert.deepEqual(f.snapshot(), before);
      } finally { f.cleanup(); }
    });
  }
}

test('failure while staging the second encrypted file leaves both destinations untouched', () => {
  const f = fixture();
  try {
    f.runtime().saveCredential(host, { cliToken: 'cli_original', account: alice });
    const before = f.snapshot();
    assert.throws(() => f.runtime({ stageDenied: f.vault }).saveCredential(host, {
      cliToken: 'cli_failed_attempt', account: bob,
    }), (error: any) => error.code === 'ENOSPC');
    assert.deepEqual(f.snapshot(), before);
    assert.equal(f.runtime().loadCliToken(host), 'cli_original');
  } finally { f.cleanup(); }
});

test('a blocked rollback retains encrypted recovery data, fails closed, and recovers exact bytes on retry', () => {
  const f = fixture();
  try {
    f.runtime().saveCredential(host, { cliToken: 'cli_original', account: alice });
    const before = f.snapshot();
    let legacyWrites = 0;
    const failing = f.runtime({
      renameDenied: f.vault,
      beforeRename: (_from, to) => {
        if (to === f.legacy && ++legacyWrites > 1) {
          throw Object.assign(new Error('Simulated rollback lock'), { code: 'EPERM' });
        }
      },
    });
    assert.throws(() => failing.saveCredential(host, { cliToken: 'cli_failed_attempt', account: bob }),
      (error: any) => error.code === 'CREDENTIAL_STORE_UNREADABLE');
    const pending = f.snapshot();
    const recovery = fs.readFileSync(`${f.vault}.rollback`, 'utf8');
    assert.equal(recovery.includes('cli_original'), false);
    assert.equal(recovery.includes('cli_failed_attempt'), false);
    assert.equal(recovery.includes('alice'), false);
    for (const operation of [() => failing.loadCliToken(host), () => failing.load(host),
      () => failing.saveCredential(host, { cliToken: 'cli_another_attempt' }), () => failing.clearAllCredentials(host)]) {
      assert.throws(operation, (error: any) => error.code === 'CREDENTIAL_STORE_UNREADABLE');
      assert.deepEqual(f.snapshot(), pending);
    }
    const reader = f.runtime();
    assert.equal(reader.loadCliToken(host), 'cli_original');
    assert.equal(reader.getActiveCredential(host)?.account?.loginName, 'alice');
    assert.equal(reader.listCredentials(host).length, 1);
    assert.deepEqual(f.snapshot(), before);
  } finally { f.cleanup(); }
});

test('an active writer or malformed recovery record cannot be mistaken for an old CLI edit', () => {
  const f = fixture();
  try {
    const store = f.runtime();
    store.saveCredential(host, { cliToken: 'cli_original', account: alice });
    const recovery = { version: 1, pid: process.ppid,
      legacy: fs.readFileSync(f.legacy, 'utf8'), vault: fs.readFileSync(f.vault, 'utf8'),
      legacyTemp: `${path.basename(f.legacy)}.${process.ppid}.0123456789ab.tmp`,
      vaultTemp: `${path.basename(f.vault)}.${process.ppid}.0123456789ab.tmp` };
    for (const contents of [JSON.stringify(recovery), '{"version":1']) {
      fs.writeFileSync(`${f.vault}.rollback`, contents);
      const before = f.snapshot();
      assert.throws(() => store.loadCliToken(host), (error: any) => error.code === 'CREDENTIAL_STORE_UNREADABLE');
      assert.deepEqual(f.snapshot(), before);
    }
  } finally { f.cleanup(); }
});

for (const damaged of ['legacy', 'vault'] as const) {
  test(`a damaged ${damaged} recovery backup cannot overwrite either credential file`, () => {
    const f = fixture();
    try {
      const store = f.runtime();
      store.saveCredential(host, { cliToken: 'cli_original', account: alice });
      const recovery = { version: 1, pid: process.pid,
        legacy: fs.readFileSync(f.legacy, 'utf8'), vault: fs.readFileSync(f.vault, 'utf8'),
        legacyTemp: `${path.basename(f.legacy)}.${process.pid}.0123456789ab.tmp`,
        vaultTemp: `${path.basename(f.vault)}.${process.pid}.0123456789ab.tmp` };
      recovery[damaged] = '{"nonce":"' + '00'.repeat(12) + '","tag":"' + '00'.repeat(16) + '","data":"00"}';
      fs.writeFileSync(`${f.vault}.rollback`, JSON.stringify(recovery));
      const before = f.snapshot();
      assert.throws(() => store.loadCliToken(host), (error: any) => error.code === 'CREDENTIAL_STORE_UNREADABLE');
      assert.deepEqual(f.snapshot(), before);
    } finally { f.cleanup(); }
  });
}

for (const interruption of ['before-vault', 'before-commit'] as const) {
  test(`a fresh process restores both encrypted files after writer exit ${interruption}`, () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-write-recovery-'));
    const directory = path.join(home, '.ae-cli', 'secure-tokens');
    const snapshot = () => Object.fromEntries(fs.readdirSync(directory).sort().map(name =>
      [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
    const run = (script: string) => spawnSync(process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', script], {
        cwd: new URL('../', import.meta.url), encoding: 'utf8',
        env: { ...process.env, HOME: home, USERPROFILE: home },
      });
    const prelude = `
      import fs from 'node:fs';
      import assert from 'node:assert/strict';
      import * as store from './src/core/secure-store.ts';
      const host = 'https://crash-fixture.invalid';
    `;
    try {
      const seed = run(`${prelude} store.saveCredential(host, {
        cliToken: 'cli_original', account: { openId: 'a', loginName: 'alice', userName: 'Alice' }
      });`);
      assert.equal(seed.status, 0, seed.stderr);
      const before = snapshot();
      const writer = run(`${prelude}
        const rename = fs.renameSync;
        const unlink = fs.unlinkSync;
        fs.renameSync = (from, to) => {
          if (${JSON.stringify(interruption)} === 'before-vault' && String(to).endsWith('.accounts.v1.enc.json')) process.exit(73);
          return rename(from, to);
        };
        fs.unlinkSync = (file) => {
          if (${JSON.stringify(interruption)} === 'before-commit' && String(file).endsWith('.rollback')) process.exit(73);
          return unlink(file);
        };
        store.saveCredential(host, { cliToken: 'cli_failed_attempt' });
      `);
      assert.equal(writer.status, 73, writer.stderr);
      assert.equal(fs.existsSync(path.join(directory, 'crash-fixture.invalid.accounts.v1.enc.json.rollback')), true);
      const reader = run(`${prelude}
        assert.equal(store.loadCliToken(host), 'cli_original');
        assert.equal(store.getActiveCredential(host).account.loginName, 'alice');
        assert.equal(store.listCredentials(host).length, 1);
      `);
      assert.equal(reader.status, 0, reader.stderr);
      assert.deepEqual(snapshot(), before);
    } finally { fs.rmSync(home, { recursive: true, force: true }); }
  });
}

for (const platform of ['linux', 'win32']) {
  test(`${platform} keeps native and fallback historical encryption compatible`, () => {
    const f = fixture();
    try {
      const native = f.runtime({ platform });
      f.writeOld(f.legacy, `${platform}:${uuid}`);
      assert.equal(native.load(host)?.cliToken, payload.cliToken);
      f.writeOld(f.legacy, f.fallbackId(platform));
      assert.equal(native.loadCliToken(host), payload.cliToken);
      native.saveCredential(host, { cliToken: 'cli_after_upgrade', account: alice });
      assert.equal(f.runtime({ platform, nativeAvailable: false }).loadCliToken(host), 'cli_after_upgrade');
      assert.equal(f.readOld(f.legacy, f.fallbackId(platform)).cliToken, 'cli_after_upgrade');
    } finally { f.cleanup(); }
  });
}

for (const variable of ['SystemRoot', 'WINDIR']) {
  test(`Windows resolves reg.exe from ${variable} when PATH omits System32`, () => {
    const f = fixture();
    try {
      f.writeOld(f.legacy, `win32:${uuid}`);
      const store = f.runtime({ platform: 'win32', systemEnv: { [variable]: 'D:\\Windows' }, regOnPath: false });
      assert.equal(store.loadCliToken(host), payload.cliToken);
      store.saveCredential(host, { cliToken: 'cli_windows_updated', account: alice });
      assert.equal(f.readOld(f.legacy, `win32:${uuid}`).cliToken, 'cli_windows_updated');
      assert.deepEqual(f.commands, ['D:\\Windows\\System32\\reg.exe']);
    } finally { f.cleanup(); }
  });
}

test('Windows retains legacy PATH lookup when system-root variables are missing', () => {
  const f = fixture();
  try {
    f.writeOld(f.legacy, `win32:${uuid}`);
    assert.equal(f.runtime({ platform: 'win32', systemEnv: {} }).loadCliToken(host), payload.cliToken);
    assert.deepEqual(f.commands, ['reg']);
  } finally { f.cleanup(); }
});

test('Windows registry access failure preserves native-encrypted credentials', () => {
  const f = fixture();
  try {
    f.runtime({ platform: 'win32' }).saveCredential(host, { cliToken: 'cli_windows', account: alice });
    const before = f.snapshot();
    const restricted = f.runtime({ platform: 'win32', nativeAvailable: false });
    assert.throws(() => restricted.loadCliToken(host), /Cannot read or decrypt/);
    assert.throws(() => restricted.saveCredential(host, { cliToken: 'cli_replacement' }), /Cannot read or decrypt/);
    assert.deepEqual(f.snapshot(), before);
    assert.equal(f.runtime({ platform: 'win32' }).loadCliToken(host), 'cli_windows');
  } finally { f.cleanup(); }
});
