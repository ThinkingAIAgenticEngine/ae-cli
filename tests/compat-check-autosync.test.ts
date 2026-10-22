import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-compat-autosync-'));
const environmentKeys = [
  'HOME', 'AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE',
  'AE_CLI_NO_COMPAT_CHECK', 'AE_CLI_NO_UPDATE_CHECK', 'SANDBOX_RUNTIME_ROOT', 'CI',
];
const previousEnvironment = new Map(environmentKeys.map(key => [key, process.env[key]]));
process.env.HOME = testHome;
for (const key of environmentKeys.filter(key => key !== 'HOME')) delete process.env[key];
after(() => {
  for (const [key, value] of previousEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(testHome, { recursive: true, force: true });
});

const { runHostCompatCheck } = await import('../src/core/compat-check.js');
const repositoryPackage = fileURLToPath(new URL('../package.json', import.meta.url));
const configDirectory = path.join(testHome, '.ae-cli');
const packageName = '@thinkingai/ae-cli';
const businessArgv = ['node', 'ae-cli', 'analysis', 'report', 'list'];

function fixture(
  t: TestContext,
  current = '6.0.54',
  liveTargets: Array<string | null> = ['6.1.24'],
  name = packageName,
) {
  fs.rmSync(configDirectory, { recursive: true, force: true });
  const directory = fs.mkdtempSync(path.join(testHome, 'scenario-'));
  const prefix = path.join(directory, 'npm prefix');
  const globalRoot = process.platform === 'win32'
    ? path.join(prefix, 'node_modules') : path.join(prefix, 'lib', 'node_modules');
  const packageRoot = path.join(globalRoot, name);
  const bin = process.platform === 'win32'
    ? path.join(prefix, 'ae-cli.cmd') : path.join(prefix, 'bin', 'ae-cli');
  const skillsDirectory = path.join(testHome, '.agents', 'skills');
  fs.rmSync(skillsDirectory, { recursive: true, force: true });
  t.mock.method(os, 'homedir', () => testHome);
  const host = 'https://compat-autosync.example.invalid';
  process.env.AE_CLI_TOKEN = 'cli_autosync_fixture';
  process.env.AE_CLI_TOKEN_HOST = host;

  function installPackage(version: string) {
    fs.mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(packageRoot, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({ name, version }));
    fs.writeFileSync(path.join(packageRoot, 'bin', 'ae-cli.js'), '#!/usr/bin/env node\n');
    const skill = path.join(packageRoot, 'skills', 'ae-agent');
    fs.mkdirSync(path.join(skill, 'references'), { recursive: true });
    fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: ae-agent\ndescription: "Auto-sync fixture"\n---\n');
    fs.writeFileSync(path.join(skill, 'references', 'release.md'), `Release ${version}\n`);
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    if (!fs.existsSync(bin)) {
      if (process.platform === 'win32') {
        fs.writeFileSync(bin, `@node "%dp0%\\node_modules\\${name.replace(/\//g, '\\')}\\bin\\ae-cli.js" %*`);
      } else fs.symlinkSync(path.join(packageRoot, 'bin', 'ae-cli.js'), bin);
    }
  }
  installPackage(current);

  // The source checkout is internal; emulate public distribution metadata in memory.
  const readFileSync = fs.readFileSync;
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    if (file === repositoryPackage) return JSON.stringify({ name, version: current });
    return readFileSync(file, ...args);
  });
  const calls: Array<{ command: string; args: string[] }> = [];
  t.mock.method(spawn, 'sync', (command: string, args: string[]) => {
    calls.push({ command, args });
    const ok = (stdout = '') => ({ status: 0, signal: null, stdout, stderr: '' });
    if (args[0] === '--version') {
      return ok(command === bin
        ? JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version : '10.8.2');
    }
    if (args[0] === 'root') return ok(globalRoot);
    if (args[0] === 'prefix') return ok(prefix);
    if (args[0] === 'install') {
      assert.equal(args[2].startsWith(`${name}@`), true);
      installPackage(args[2].slice(name.length + 1));
      return ok();
    }
    if (args.includes('add')) {
      assert.equal(args[1], 'skills@1.5.12');
      if (args.includes('--copy')) assert.equal(args[3], skillsDirectory);
      else {
        assert.equal(args[3], path.join(packageRoot, 'skills'));
        fs.cpSync(path.join(packageRoot, 'skills'), skillsDirectory, { recursive: true });
      }
      return ok();
    }
    throw new Error(`Unexpected subprocess: ${command} ${args.join(' ')}`);
  });
  let fetchCalls = 0;
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, host);
    assert.equal(url.pathname, '/v1/ta/cli/config');
    assert.equal(new Headers(init?.headers).get('cli-token'), 'cli_autosync_fixture');
    const target = liveTargets[Math.min(fetchCalls++, liveTargets.length - 1)];
    return target === null
      ? new Response('Unavailable', { status: 503 })
      : Response.json({ data: { versions: { aeCliVersion: target, clusterVersion: target.startsWith('6.0.') ? '6.0' : '6.1' } } });
  });

  function cache(target: string) {
    fs.mkdirSync(configDirectory, { recursive: true });
    fs.writeFileSync(path.join(configDirectory, 'compat-check.json'), JSON.stringify({ hosts: {
      [host]: { host, localVersion: current, expectedVersion: target, clusterVersion: '6.1', lastFetchedAt: new Date().toISOString() },
    } }));
  }
  async function run(argv = businessArgv) {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const out = t.mock.method(process.stdout, 'write', chunk => { stdout.push(String(chunk)); return true; });
    const err = t.mock.method(process.stderr, 'write', chunk => { stderr.push(String(chunk)); return true; });
    try {
      const result = await runHostCompatCheck({ name, version: current }, host, argv);
      assert.equal(stdout.join(''), '', 'Startup compatibility checks must preserve JSON stdout');
      return { result, stderr: stderr.join('') };
    } finally {
      out.mock.restore();
      err.mock.restore();
    }
  }
  return { run, cache, calls, host, packageRoot, skillsDirectory, fetchCalls: () => fetchCalls };
}

for (const [current, target, direction] of [
  ['6.0.54', '6.1.24', 'switch'],
  ['6.0.53', '6.0.54', 'upgrade'],
  ['6.1.25', '6.1.24', 'downgrade'],
]) {
  test(`startup synchronizes ${current} to ${target} with matching Skills`, async t => {
    const f = fixture(t, current, [target]);
    const { result } = await f.run();
    assert.deepEqual(result, { status: 'synced', current, expected: target, cluster: target.startsWith('6.0.') ? '6.0' : '6.1', direction });
    assert.equal(f.fetchCalls(), 2, 'A live confirmation is required before installation');
    const installs = f.calls.filter(call => call.args[0] === 'install');
    assert.equal(installs.length, 1);
    assert.deepEqual(installs[0].args, ['install', '-g', `${packageName}@${target}`, '--registry', 'https://registry.npmjs.org']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.packageRoot, 'package.json'), 'utf8')).version, target);
    assert.equal(fs.readFileSync(path.join(f.skillsDirectory, 'ae-agent', 'references', 'release.md'), 'utf8'), `Release ${target}\n`);
    const skillsCalls = f.calls.filter(call => call.args.includes('add'));
    assert.equal(skillsCalls.length, 2);
    assert.ok(skillsCalls[1].args.includes('--copy'));
  });
}

for (const version of ['6.0.54-rc.1', '6.0.54+build.1', '6.0.54junk', '6.0.54.1']) {
  test(`startup leaves non-release source ${version} untouched`, async t => {
    const f = fixture(t, version);
    assert.deepEqual((await f.run()).result, { status: 'continue' });
    assert.equal(f.calls.length, 0);
    assert.equal(f.fetchCalls(), 1);
  });
}

for (const version of ['6.1.24-rc.1', '6.1.24+build.1', '6.1.24junk', '6.1.24.1', '06.1.24']) {
  test(`startup leaves non-release target ${version} untouched`, async t => {
    const f = fixture(t, '6.0.54', [version]);
    assert.deepEqual((await f.run()).result, { status: 'continue' });
    assert.equal(f.calls.length, 0);
    assert.equal(f.fetchCalls(), 1);
    assert.equal(fs.existsSync(path.join(configDirectory, 'version-sync.json')), false);
  });
}

test('startup rejects a target that becomes non-release during live confirmation', async t => {
  const f = fixture(t, '6.0.54', ['6.1.24', '6.1.25-rc.1']);
  assert.deepEqual((await f.run()).result, { status: 'continue' });
  assert.equal(f.fetchCalls(), 2);
  assert.equal(f.calls.length, 0);
  assert.equal(fs.existsSync(path.join(configDirectory, 'version-sync.json')), false);
});

test('startup installs the live target instead of a fresh cached target', async t => {
  const f = fixture(t, '6.0.54', ['6.1.25']);
  f.cache('6.1.24');
  const { result } = await f.run();
  assert.equal(result.status, 'synced');
  if (result.status === 'synced') assert.equal(result.expected, '6.1.25');
  assert.equal(f.fetchCalls(), 1);
  assert.equal(f.calls.find(call => call.args[0] === 'install')?.args[2], `${packageName}@6.1.25`);
});

for (const cached of [false, true]) {
  test(`startup continues when live confirmation fails ${cached ? 'with' : 'without'} cache`, async t => {
    const f = fixture(t, '6.0.54', cached ? [null] : ['6.1.24', null]);
    if (cached) f.cache('6.1.24');
    assert.deepEqual((await f.run()).result, { status: 'continue' });
    assert.equal(f.fetchCalls(), cached ? 1 : 2);
    assert.equal(f.calls.length, 0);
  });
}

test('startup respects the automatic retry limit and continues the command', async t => {
  const f = fixture(t);
  fs.mkdirSync(configDirectory, { recursive: true });
  const now = new Date();
  fs.writeFileSync(path.join(configDirectory, 'version-sync.json'), JSON.stringify({ hosts: {
    [f.host]: { target: '6.1.24', attemptDay: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      attemptsToday: 3, lastAttemptAt: now.toISOString() },
  } }));
  assert.deepEqual((await f.run()).result, { status: 'continue' });
  assert.equal(f.fetchCalls(), 2);
  assert.equal(f.calls.length, 0);
});

for (const command of ['auth', 'config', 'install', 'update']) {
  test(`startup never auto-installs while running ${command}`, async t => {
    const f = fixture(t);
    assert.deepEqual((await f.run(['node', 'ae-cli', command])).result, { status: 'continue' });
    assert.equal(f.calls.length, 0);
  });
}

test('startup preserves the internal distribution', async t => {
  const f = fixture(t, '6.0.54', ['6.1.24'], '@tant/ae-cli');
  assert.deepEqual((await f.run()).result, { status: 'continue' });
  assert.equal(f.calls.length, 0);
});

for (const flag of ['--help', '--version', '--no-update-check']) {
  test(`startup skips compatibility requests for ${flag}`, async t => {
    const f = fixture(t);
    assert.deepEqual((await f.run(['node', 'ae-cli', flag])).result, { status: 'continue' });
    assert.equal(f.fetchCalls(), 0);
    assert.equal(f.calls.length, 0);
  });
}

test('startup skips compatibility requests inside an AE sandbox', async t => {
  const f = fixture(t);
  process.env.SANDBOX_RUNTIME_ROOT = testHome;
  t.after(() => { delete process.env.SANDBOX_RUNTIME_ROOT; });
  assert.deepEqual((await f.run()).result, { status: 'continue' });
  assert.equal(f.fetchCalls(), 0);
  assert.equal(f.calls.length, 0);
});
