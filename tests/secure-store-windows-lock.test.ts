/** Real Windows file handles, real credential crypto and fresh-process verification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

for (const operation of ['replace', 'add', 'activate', 'remove-active']) {
  for (const locked of ['legacy', 'vault']) {
    test(`Windows ${operation}: a real ${locked} file lock preserves the credential pair`, {
      skip: process.platform !== 'win32' ? 'Requires real Windows rename/file-handle semantics' : false,
    }, () => {
      const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-windows-lock-'));
      const directory = path.join(home, '.ae-cli', 'secure-tokens');
      const run = (script: string) => spawnSync(process.execPath,
        ['--import', 'tsx', '--input-type=module', '-e', script], {
          cwd: new URL('../', import.meta.url), encoding: 'utf8',
          env: { ...process.env, HOME: home, USERPROFILE: home },
        });
      const prelude = `
        import assert from 'node:assert/strict';
        import fs from 'node:fs';
        import path from 'node:path';
        import * as store from './src/core/secure-store.ts';
        const host = 'https://windows-lock-fixture.invalid';
        const alice = { openId: 'a', loginName: 'alice', userName: 'Alice' };
        const bob = { openId: 'b', loginName: 'bob', userName: 'Bob' };
        const dir = path.join(process.env.HOME, '.ae-cli', 'secure-tokens');
        const snapshot = () => Object.fromEntries(fs.readdirSync(dir).sort().map(name =>
          [name, fs.readFileSync(path.join(dir, name), 'utf8')]));
      `;
      try {
        const writer = run(`${prelude}
          store.saveCredential(host, { cliToken: 'cli_fixture_alice', account: alice });
          store.saveCredential(host, { cliToken: 'cli_fixture_bob', account: bob }, { add: true });
          const before = snapshot();
          const suffix = ${JSON.stringify(locked)} === 'vault' ? '.accounts.v1.enc.json' : '.enc.json';
          const fd = fs.openSync(path.join(dir, 'windows-lock-fixture.invalid' + suffix), 'r+');
          try {
            assert.throws(() => {
              switch (${JSON.stringify(operation)}) {
                case 'replace': store.saveCredential(host, { cliToken: 'cli_failed_attempt' }); break;
                case 'add': store.saveCredential(host, { cliToken: 'cli_failed_attempt', account: alice }, { add: true }); break;
                case 'activate': store.activateCredential(host, 'alice'); break;
                case 'remove-active': store.removeActiveCredential(host); break;
              }
            }, error => error.code === 'EPERM' && /rename/i.test(error.message));
            assert.deepEqual(snapshot(), before, 'Both encrypted files must be byte-for-byte unchanged while locked');
          } finally { fs.closeSync(fd); }
          assert.deepEqual(snapshot(), before, 'No temporary or recovery files may remain after successful rollback');
        `);
        assert.equal(writer.status, 0, writer.stderr || writer.error?.message);
        const beforeRead = Object.fromEntries(fs.readdirSync(directory).sort().map(name =>
          [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
        const reader = run(`${prelude}
          const before = snapshot();
          assert.equal(store.loadCliToken(host), 'cli_fixture_bob');
          assert.equal(store.load(host).cliToken, 'cli_fixture_bob');
          assert.equal(store.getActiveCredential(host).account.loginName, 'bob');
          const accounts = store.listCredentials(host);
          assert.equal(accounts.length, 2);
          assert.deepEqual(accounts.map(entry => entry.account.loginName), ['alice', 'bob']);
          assert.equal(accounts.some(entry => entry.cliToken === 'cli_failed_attempt'), false);
          assert.deepEqual(snapshot(), before, 'A fresh read must not import a failed token or change bytes');
        `);
        assert.equal(reader.status, 0, reader.stderr || reader.error?.message);
        const afterRead = Object.fromEntries(fs.readdirSync(directory).sort().map(name =>
          [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
        assert.deepEqual(afterRead, beforeRead);
      } finally { fs.rmSync(home, { recursive: true, force: true }); }
    });
  }
}
