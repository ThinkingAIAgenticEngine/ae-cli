import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import spawn from 'cross-spawn';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invoke = (bin, args) => spawnSync(process.execPath, [bin, ...args], {
  encoding: 'utf8', env: { ...process.env, AE_CLI_NO_COMPAT_CHECK: '1' }, timeout: 30_000,
});

test('built package bin exposes install, dry-run and stable JSON', () => {
  const bin = path.join(root, 'bin', 'ae-cli.js');
  const help = invoke(bin, ['install', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.doesNotMatch(help.stdout, /--agent/);
  assert.match(help.stdout, /native Windows/);
  assert.doesNotMatch(help.stdout, /use WSL/);
  const dry = invoke(bin, ['install', '--dry-run', '--format', 'json']);
  assert.equal(dry.status, 0, dry.stderr);
  const body = JSON.parse(dry.stdout);
  assert.equal(body.ok, true);
  assert.equal(body.cli.package, '@tant/ae-cli');
  assert.equal(body.cli.verified, false);
  assert.match(body.skills.directory, /\.agents[\\/]skills$/);
  assert.equal(body.dry_run, true);
});

test('npm pack includes installer chunks, Skills and the public npx single-bin entry', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-public-entry-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  for (const file of ['bin', 'dist', 'skills', 'package.json', 'cli-installation-guide.md']) {
    fs.cpSync(path.join(root, file), path.join(temp, file), { recursive: true });
  }
  // Model the actual public conversion without running it in the user's checkout.
  const pkg = JSON.parse(fs.readFileSync(path.join(temp, 'package.json'), 'utf8'));
  pkg.name = '@thinkingai/ae-cli';
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify(pkg));
  fs.rmSync(path.join(temp, 'skills', 'ae-page-context'), { recursive: true, force: true });
  const packed = spawn.sync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: temp, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(packed.status, 0, packed.stderr);
  const files = new Set(JSON.parse(packed.stdout)[0].files.map(file => file.path));
  assert.ok(files.has('bin/ae-cli.js'));
  assert.ok(files.has('dist/index.js'));
  assert.ok(files.has('cli-installation-guide.md'));
  assert.ok(files.has('skills/ae-agent/SKILL.md'));
  assert.equal(files.has('skills/ae-page-context/SKILL.md'), false);
  // npx infers this unique bin from @thinkingai/ae-cli@latest, forwarding "install" unchanged.
  assert.deepEqual(Object.keys(pkg.bin), ['ae-cli']);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), 'junction');
  const entry = path.join(temp, pkg.bin['ae-cli']);
  const result = invoke(entry, ['install', '--dry-run', '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.cli.package, '@thinkingai/ae-cli');
  assert.match(body.commands[0], /@thinkingai\/ae-cli@/);
  assert.match(body.commands[2], /ThinkingAIAgenticEngine\/ae-cli#v/);
});
