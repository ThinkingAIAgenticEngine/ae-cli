import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import childProcess, { type SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import spawn from 'cross-spawn';
import { skillCopyHash } from '../src/core/skills-tool.js';

const testHome = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-compat-autosync-')));
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
const { saveCredential } = await import('../src/core/secure-store.js');
const { saveConfig } = await import('../src/core/config.js');
const { rememberBusinessConfig, readBusinessConfig } = await import('../src/core/business-config.js');
const { refreshEnvironmentConfig } = await import('../src/core/environment-refresh.js');
const repositoryPackage = fileURLToPath(new URL('../package.json', import.meta.url));
const configDirectory = path.join(testHome, '.ae-cli');
const packageName = '@thinkingai/ae-cli';
const businessArgv = ['node', 'ae-cli', 'analysis', 'report', 'list'];
let startupScenario = 0;

function fixture(
  t: TestContext,
  current = '6.0.54',
  liveTargets: Array<string | null> = ['6.1.24'],
  name = packageName,
  options: { dataops?: boolean; claude?: boolean } = {},
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
  const skillTargets = [
    { agent: 'universal', directory: skillsDirectory, detected: true, installable: true },
    ...(options.claude ? [{ agent: 'claude-code', directory: path.join(testHome, '.claude', 'skills'), detected: true, installable: true }] : []),
  ];
  for (const target of skillTargets) fs.rmSync(target.directory, { recursive: true, force: true });
  t.mock.method(os, 'homedir', () => testHome);
  const host = 'https://compat-autosync.example.invalid';
  delete process.env.AE_CLI_TOKEN;
  delete process.env.AE_CLI_TOKEN_HOST;
  saveCredential(host, { cliToken: 'cli_autosync_fixture' });
  saveConfig({ activeHost: host, hosts: { [host]: { label: 'fixture' } } });

  function installPackage(version: string) {
    fs.mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(packageRoot, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({ name, version }));
    fs.writeFileSync(path.join(packageRoot, 'bin', 'ae-cli.js'), '#!/usr/bin/env node\n');
    for (const skillName of ['ae-agent', ...(options.dataops ? ['ae-dataops'] : [])]) {
      const skill = path.join(packageRoot, 'skills', skillName);
      fs.mkdirSync(path.join(skill, 'references'), { recursive: true });
      fs.writeFileSync(path.join(skill, 'SKILL.md'), `---\nname: ${skillName}\ndescription: "Auto-sync fixture"\n---\n`);
      fs.writeFileSync(path.join(skill, 'references', 'release.md'), `Release ${version}\n`);
    }
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
  t.mock.method(spawn, 'sync', (command: string, args: string[], options: any) => {
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
    if (args[0].endsWith('adapter.mjs')) {
      const request = JSON.parse(options.input);
      if (request.action === 'targets') return ok(JSON.stringify({ ok: true, data: skillTargets }));
      assert.equal(request.action, 'apply');
      return ok(JSON.stringify({ ok: true, data: request.operations.map((operation: any) => {
        const destination = path.join(operation.target.directory, operation.skill);
        fs.rmSync(destination, { recursive: true, force: true });
        if (operation.action === 'install') fs.cpSync(operation.source, destination, { recursive: true });
        return { action: operation.action, skill: operation.skill, agent: operation.target.agent,
          path: destination, status: 'success', hash: skillCopyHash(destination) ?? undefined };
      }) }));
    }
    throw new Error(`Unexpected subprocess: ${command} ${args.join(' ')}`);
  });
  const resumeState = { code: 0, signal: null as NodeJS.Signals | null, spawnError: false, throwOnSpawn: false, errorAfterSpawn: false,
    body: { ok: true, data: { items: [] } } as Record<string, unknown> };
  const resumeCalls: Array<{ command: string; args: string[]; options: SpawnOptions }> = [];
  t.mock.method(childProcess, 'spawn', (command: string, args: string[], options: SpawnOptions) => {
    resumeCalls.push({ command, args, options });
    if (resumeState.throwOnSpawn) throw new Error('Fixture launch failure');
    const child = Object.assign(new EventEmitter(), { kill: () => true });
    queueMicrotask(() => {
      if (resumeState.spawnError) {
        child.emit('error', new Error('Fixture launch failure'));
        child.emit('close', -2, null);
        return;
      }
      child.emit('spawn');
      if (resumeState.errorAfterSpawn) child.emit('error', new Error('Fixture error after launch'));
      if (!resumeState.signal) process.stdout.write(JSON.stringify(resumeState.body) + '\n');
      child.emit('close', resumeState.signal ? null : resumeState.code, resumeState.signal);
    });
    return child;
  });
  let fetchCalls = 0;
  let businesses: Record<string, boolean> | undefined = { agent: true };
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, host);
    assert.equal(url.pathname, '/v1/ta/cli/config');
    const header = new Headers(init?.headers).get('cli-token');
    assert.equal(header ?? url.searchParams.get('cli-token'), 'cli_autosync_fixture');
    const target = liveTargets[Math.min(fetchCalls++, liveTargets.length - 1)];
    return target === null
      ? new Response('Unavailable', { status: 503 })
      : Response.json({ data: { versions: { aeCliVersion: target, clusterVersion: target.startsWith('6.0.') ? '6.0' : '6.1' }, businesses } });
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
  async function runStartup(args = ['--host', host, 'project', 'info', 'list']) {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const previousArgv = process.argv;
    const previousExitCode = process.exitCode;
    const writeStdout = process.stdout.write.bind(process.stdout);
    const out = t.mock.method(process.stdout, 'write', chunk => {
      // Node's test runner writes binary events through the same stream.
      if (typeof chunk !== 'string') return writeStdout(chunk);
      stdout.push(chunk);
      return true;
    });
    const err = t.mock.method(process.stderr, 'write', chunk => { stderr.push(String(chunk)); return true; });
    process.argv = ['node', 'ae-cli', ...args];
    process.exitCode = undefined;
    try {
      const entry = new URL('../src/index.ts', import.meta.url);
      entry.searchParams.set('scenario', String(++startupScenario));
      await import(entry.href);
      return { stdout: stdout.join(''), stderr: stderr.join(''), exitCode: process.exitCode };
    } finally {
      process.argv = previousArgv;
      process.exitCode = previousExitCode;
      out.mock.restore();
      err.mock.restore();
    }
  }
  return { run, runStartup, cache, calls, resumeCalls, resumeState, host, packageRoot, skillsDirectory,
    skillTargets, fetchCalls: () => fetchCalls,
    setBusinesses: (value: Record<string, boolean> | undefined) => { businesses = value; } };
}

function deferredConfigResponse(t: TestContext, host: string) {
  let entered!: () => void;
  let release!: (response: Response) => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const response = new Promise<Response>(resolve => { release = resolve; });
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(String(input));
    assert.equal(url.origin, host);
    assert.equal(url.pathname, '/v1/ta/cli/config');
    entered();
    return response;
  });
  return { started, release: () => release(Response.json({
    versions: { clusterVersion: '6.0', aeCliVersion: '6.0.56' },
    businesses: { agent: true, dataops: false },
  })) };
}

for (const [current, target] of [
  ['6.0.56', '6.1.28'],
  ['6.0.55', '6.0.56'],
  ['6.1.29', '6.1.28'],
  ['6.1.28', '6.1.28'],
]) {
  test(`startup resumes the original command once after synchronizing ${current} to ${target}`, async t => {
    const f = fixture(t, current, [target]);
    if (current === target) {
      fs.mkdirSync(configDirectory, { recursive: true });
      fs.writeFileSync(path.join(configDirectory, 'version-sync.json'), JSON.stringify({ hosts: {
        [f.host]: { target, pendingSkills: true },
      } }));
    }
    const result = await f.runStartup();
    assert.deepEqual(JSON.parse(result.stdout), f.resumeState.body);
    assert.equal(result.exitCode, 0);
    assert.doesNotMatch(result.stderr, /AE_CLI_VERSION_SYNCED|Re-run/);
    assert.match(result.stderr, /Starting the original command/);
    assert.equal(f.resumeCalls.length, 1);
    assert.equal(f.resumeCalls[0].command, process.execPath);
    assert.deepEqual(f.resumeCalls[0].args, [fs.realpathSync(path.join(f.packageRoot, 'bin', 'ae-cli.js')),
      '--host', f.host, 'project', 'info', 'list']);
    assert.equal(f.resumeCalls[0].options.stdio, 'inherit');
    assert.equal(f.resumeCalls[0].options.cwd, process.cwd());
    assert.equal(f.resumeCalls[0].options.env?.AE_CLI_NO_COMPAT_CHECK, '1');
    assert.equal(process.env.AE_CLI_NO_COMPAT_CHECK, undefined, 'The parent environment must not change');
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.packageRoot, 'package.json'), 'utf8')).version, target);
    assert.equal(f.calls.filter(call => call.args[0] === 'install').length, current === target ? 0 : 1);
    assert.equal(f.fetchCalls(), 2);
  });
}

test('startup preserves original flags and literal argument values during resume', async t => {
  const f = fixture(t);
  const args = ['--host', f.host, '--format', 'json', '--jq', '.items[] | {id}', '--yes',
    '--dry-run', 'capability', 'run', 'fixture.resource.action', '--input',
    '{"text":"spaces & $() `literal` %PATH%"}', '--', ''];
  const result = await f.runStartup(args);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(f.resumeCalls[0].args.slice(1), args);
});

for (const errorAfterSpawn of [false, true]) {
  test(`startup preserves business failure without retries (post-start error: ${errorAfterSpawn})`, async t => {
    const f = fixture(t);
    f.resumeState.code = 7;
    f.resumeState.body = { ok: false, error: { type: 'api', code: 'FIXTURE_BUSINESS_FAILURE' } };
    f.resumeState.errorAfterSpawn = errorAfterSpawn;
    const result = await f.runStartup();
    assert.equal(result.exitCode, 7);
    assert.deepEqual(JSON.parse(result.stdout), f.resumeState.body);
    assert.doesNotMatch(result.stderr, /AE_CLI_VERSION_SYNCED|Re-run/);
    assert.equal(f.resumeCalls.length, 1);
  });
}

for (const scenario of ['success', 'business-failure', 'not-started'] as const) {
  test(`legacy retry wrappers execute the original command once after ${scenario}`, async t => {
    const f = fixture(t);
    f.resumeState.code = scenario === 'business-failure' ? 1 : 0;
    f.resumeState.body = scenario === 'business-failure'
      ? { ok: false, error: { type: 'api', code: 'FIXTURE_BUSINESS_FAILURE' } }
      : { ok: true, data: { updated: true } };
    f.resumeState.spawnError = scenario === 'not-started';
    const result = await f.runStartup();
    const body = JSON.parse(result.stdout || result.stderr.slice(result.stderr.indexOf('{')));
    assert.equal(f.resumeCalls.length, 1);
    assert.equal(result.exitCode, scenario === 'success' ? 0 : 1);

    // Old callers can recognize either the error code or the explicit retry flag.
    for (const retryRequested of [
      body.error?.code === 'AE_CLI_VERSION_SYNCED',
      body.meta?.retryOriginalCommand === true,
    ]) {
      const rerun = t.mock.fn();
      if (result.exitCode === 1 && retryRequested) rerun();
      assert.equal(rerun.mock.callCount(), scenario === 'not-started' ? 1 : 0);
      if (rerun.mock.callCount() > 0) assert.equal(body.meta.originalCommandExecuted, false);
    }
    if (scenario === 'not-started') {
      assert.equal(body.error.code, 'AE_CLI_VERSION_SYNCED');
      assert.equal(body.meta.retryOriginalCommand, true);
    } else {
      assert.doesNotMatch(result.stderr, /AE_CLI_VERSION_SYNCED|Re-run/);
      assert.deepEqual(body, f.resumeState.body);
    }
  });
}

for (const failure of ['spawnError', 'throwOnSpawn'] as const) {
  test(`startup keeps the manual retry contract when the new process cannot start (${failure})`, async t => {
    const f = fixture(t, '6.0.56', ['6.1.28']);
    f.resumeState[failure] = true;
    const signals: NodeJS.Signals[] = process.platform === 'win32'
      ? ['SIGINT', 'SIGTERM']
      : ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGTSTP', 'SIGCONT', 'SIGWINCH'];
    const listeners = signals.map(signal => [signal, process.listenerCount(signal)] as const);
    const result = await f.runStartup();
    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, '');
    const body = JSON.parse(result.stderr.slice(result.stderr.indexOf('{')));
    assert.equal(body.ok, false);
    assert.equal(body.error.type, 'config');
    assert.equal(body.error.code, 'AE_CLI_VERSION_SYNCED');
    assert.equal(body.meta.current, '6.0.56');
    assert.equal(body.meta.expected, '6.1.28');
    assert.equal(body.meta.retryOriginalCommand, true);
    assert.equal(body.meta.versionSyncSucceeded, true);
    assert.equal(body.meta.originalCommandExecuted, false);
    assert.match(body.error.message, /succeeded.*could not be started/);
    assert.match(body.error.hint, /Re-run/);
    assert.equal(f.resumeCalls.length, 1);
    for (const [signal, count] of listeners) assert.equal(process.listenerCount(signal), count);
  });
}

test('startup mirrors the resumed child signal without retrying or reporting synchronization failure', async t => {
  const f = fixture(t);
  f.resumeState.signal = 'SIGTERM';
  const kills: Array<[number, string | number | undefined]> = [];
  t.mock.method(process, 'kill', (pid, signal) => { kills.push([pid, signal]); return true; });
  const result = await f.runStartup();
  assert.equal(result.exitCode, 143);
  assert.deepEqual(kills, [[process.pid, 'SIGTERM']]);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stderr, /AE_CLI_VERSION_SYNCED|Re-run/);
  assert.equal(f.resumeCalls.length, 1);
});

test('a resumed process skips compatibility requests even when its target differs', async t => {
  const f = fixture(t, '6.1.28', ['6.0.56']);
  process.env.AE_CLI_NO_COMPAT_CHECK = '1';
  t.after(() => { delete process.env.AE_CLI_NO_COMPAT_CHECK; });
  assert.deepEqual((await f.run()).result, { status: 'continue' });
  assert.equal(f.fetchCalls(), 0);
  assert.equal(f.calls.length, 0);
  assert.equal(f.resumeCalls.length, 0);
});

for (const [current, target, direction] of [
  ['6.0.54', '6.1.24', 'switch'],
  ['6.0.53', '6.0.54', 'upgrade'],
  ['6.1.25', '6.1.24', 'downgrade'],
]) {
  test(`startup synchronizes ${current} to ${target} with matching Skills`, async t => {
    const f = fixture(t, current, [target]);
    const { result } = await f.run();
    assert.deepEqual(result, { status: 'synced', current, expected: target, cluster: target.startsWith('6.0.') ? '6.0' : '6.1', direction,
      entrypoint: fs.realpathSync(path.join(f.packageRoot, 'bin', 'ae-cli.js')) });
    assert.equal(f.fetchCalls(), 2, 'A live confirmation is required before installation');
    const installs = f.calls.filter(call => call.args[0] === 'install');
    assert.equal(installs.length, 1);
    assert.deepEqual(installs[0].args, ['install', '-g', `${packageName}@${target}`, '--registry', 'https://registry.npmjs.org']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.packageRoot, 'package.json'), 'utf8')).version, target);
    assert.equal(fs.readFileSync(path.join(f.skillsDirectory, 'ae-agent', 'references', 'release.md'), 'utf8'), `Release ${target}\n`);
    const skillsCalls = f.calls.filter(call => call.args.includes('add'));
    assert.equal(skillsCalls.length, 0);
    assert.ok(f.calls.some(call => call.args[0].endsWith('adapter.mjs')));
  });
}

test('automatic upgrade does not restore Skills that fresh config explicitly closes', async t => {
  const f = fixture(t, '6.0.54', ['6.1.24']);
  fs.cpSync(path.join(f.packageRoot, 'skills'), f.skillsDirectory, { recursive: true });
  f.setBusinesses({ agent: false });
  const { result } = await f.run();
  assert.equal(result.status, 'synced');
  assert.equal(fs.existsSync(path.join(f.skillsDirectory, 'ae-agent')), false);
  assert.equal(f.calls.some(call => call.args.includes('add')), false);
});

test('external-token version replacement preserves global Skill files and does not create Skill state', async t => {
  const f = fixture(t, '6.0.54', ['6.1.24']);
  fs.cpSync(path.join(f.packageRoot, 'skills'), f.skillsDirectory, { recursive: true });
  const file = path.join(f.skillsDirectory, 'ae-agent', 'references', 'release.md');
  const before = fs.readFileSync(file, 'utf8');
  process.env.AE_CLI_TOKEN = 'cli_autosync_fixture';
  process.env.AE_CLI_TOKEN_HOST = f.host;
  t.after(() => { delete process.env.AE_CLI_TOKEN; delete process.env.AE_CLI_TOKEN_HOST; });
  const { result, stderr } = await f.run();
  assert.equal(result.status, 'synced');
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.packageRoot, 'package.json'), 'utf8')).version, '6.1.24');
  assert.match(stderr, /CLI changed from 6\.0\.54 to 6\.1\.24; global Skills were preserved/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(configDirectory, 'business-skills.json')), false);
  assert.equal(fs.existsSync(path.join(configDirectory, 'business-skill-context.json')), false);
  assert.equal(f.calls.some(call => call.args[0].endsWith('adapter.mjs')), false);
});

test('external-token Skill repair continues without claiming synchronization or clearing pending Skills', async t => {
  const f = fixture(t, '6.0.54', ['6.0.54']);
  process.env.AE_CLI_TOKEN = 'cli_autosync_fixture';
  process.env.AE_CLI_TOKEN_HOST = f.host;
  t.after(() => { delete process.env.AE_CLI_TOKEN; delete process.env.AE_CLI_TOKEN_HOST; });
  fs.writeFileSync(path.join(configDirectory, 'version-sync.json'), JSON.stringify({ hosts: {
    [f.host]: { target: '6.0.54', attemptDay: '2000-01-01', attemptsToday: 0,
      pendingSkills: true, lastFailureStage: 'skills_clients' },
  } }));
  const { result, stderr } = await f.run();
  assert.deepEqual(result, { status: 'continue' });
  assert.match(stderr, /Global Skills were not changed/);
  assert.match(stderr, /This command will continue/);
  assert.doesNotMatch(stderr, /Synchronized to|Re-run the previous command/);
  const pending = JSON.parse(fs.readFileSync(path.join(configDirectory, 'version-sync.json'), 'utf8')).hosts[f.host];
  assert.equal(pending.pendingSkills, true);
  assert.equal(pending.target, '6.0.54');
  assert.equal(pending.lastFailureStage, 'skills_clients');
  assert.equal(f.calls.some(call => call.args[0] === 'install' || call.args[0].endsWith('adapter.mjs')), false);
  assert.equal(fs.existsSync(path.join(configDirectory, 'business-skills.json')), false);
});

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

for (const [label, previous, confirmed, installed, expected] of [
  ['closes an installed business', true, false, true, false],
  ['restores a newly enabled business', false, true, false, true],
  ['preserves existing Skills when businesses is absent', false, undefined, true, true],
  ['does not add missing Skills when businesses is absent', false, undefined, false, false],
] as const) {
  test(`fresh compatibility cache ${label}`, async t => {
    const f = fixture(t, '6.0.55', ['6.0.56'], packageName, { dataops: true, claude: true });
    const source = path.join(f.packageRoot, 'skills', 'ae-dataops');
    if (installed) {
      for (const target of f.skillTargets) {
        fs.cpSync(source, path.join(target.directory, 'ae-dataops'), { recursive: true });
      }
    }
    rememberBusinessConfig(f.host, 'cli_autosync_fixture', { agent: true, dataops: previous });
    f.cache('6.0.56');
    f.setBusinesses(confirmed === undefined ? undefined : { agent: true, dataops: confirmed });

    const { result } = await f.run();

    assert.equal(result.status, 'synced');
    assert.equal(f.fetchCalls(), 1, 'The fresh compatibility cache must take the live confirmation path');
    assert.deepEqual(f.skillTargets.map(target => fs.existsSync(path.join(target.directory, 'ae-dataops'))),
      [expected, expected]);
    assert.deepEqual(readBusinessConfig(f.host, 'cli_autosync_fixture'),
      confirmed === undefined ? {} : { agent: true, dataops: confirmed });
    assert.equal(f.calls.filter(call => call.args[0] === 'install').length, 1);
    if (expected) {
      const expectedVersion = confirmed === true ? '6.0.56' : '6.0.55';
      for (const target of f.skillTargets) {
        assert.equal(fs.readFileSync(path.join(target.directory, 'ae-dataops', 'references', 'release.md'), 'utf8'),
          `Release ${expectedVersion}\n`);
      }
    }
  });
}

test('fresh compatibility cache preserves the business snapshot when live confirmation fails', async t => {
  const f = fixture(t, '6.0.55', [null], packageName, { dataops: true, claude: true });
  const previous = { agent: true, dataops: false };
  rememberBusinessConfig(f.host, 'cli_autosync_fixture', previous);
  const before = fs.readFileSync(path.join(configDirectory, 'business-config.json'), 'utf8');
  f.cache('6.0.56');

  const { result } = await f.run();

  assert.deepEqual(result, { status: 'continue' });
  assert.equal(f.fetchCalls(), 1);
  assert.equal(f.calls.length, 0, 'An unconfirmed target must not install the CLI or change Skills');
  assert.equal(fs.readFileSync(path.join(configDirectory, 'business-config.json'), 'utf8'), before);
  assert.deepEqual(readBusinessConfig(f.host, 'cli_autosync_fixture'), previous);
  assert.deepEqual(f.skillTargets.map(target => fs.existsSync(path.join(target.directory, 'ae-dataops'))), [false, false]);
});

test('a newer environment refresh supersedes a delayed automatic version confirmation', async t => {
  const f = fixture(t, '6.0.55', ['6.0.56'], packageName, { dataops: true, claude: true });
  const source = path.join(path.dirname(repositoryPackage), 'skills', 'ae-dataops');
  for (const target of f.skillTargets) {
    fs.cpSync(source, path.join(target.directory, 'ae-dataops'), { recursive: true });
  }
  const businesses = { agent: true, dataops: true };
  rememberBusinessConfig(f.host, 'cli_autosync_fixture', businesses);
  f.cache('6.0.56');
  const deferred = deferredConfigResponse(t, f.host);
  const older = f.run();
  await deferred.started;
  let newer: Awaited<ReturnType<typeof refreshEnvironmentConfig>>;
  try {
    newer = await refreshEnvironmentConfig(f.host, { fetchConfig: async () => ({
      clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses,
    }) });
  } finally {
    deferred.release();
  }
  const { result } = await older;

  assert.equal(newer.skills.status, 'success');
  assert.deepEqual(result, { status: 'continue' });
  assert.equal(f.calls.some(call => call.args[0] === 'install'), false,
    'A superseded confirmation must not replace the global CLI');
  assert.deepEqual(readBusinessConfig(f.host, 'cli_autosync_fixture'), businesses);
  assert.deepEqual(f.skillTargets.map(target => fs.existsSync(path.join(target.directory, 'ae-dataops'))), [true, true]);
});

for (const change of ['active host', 'CLI token'] as const) {
  test(`a changed ${change} invalidates a delayed automatic version confirmation`, async t => {
    const f = fixture(t, '6.0.55', ['6.0.56'], packageName, { dataops: true, claude: true });
    const businesses = { agent: true, dataops: true };
    rememberBusinessConfig(f.host, 'cli_autosync_fixture', businesses);
    f.cache('6.0.56');
    const deferred = deferredConfigResponse(t, f.host);
    const older = f.run();
    await deferred.started;
    if (change === 'active host') {
      saveConfig({ activeHost: 'https://new-context.example.invalid', hosts: {} });
    } else {
      saveCredential(f.host, { cliToken: 'cli_replacement_fixture' });
      rememberBusinessConfig(f.host, 'cli_replacement_fixture', businesses);
    }
    deferred.release();
    const { result } = await older;

    assert.deepEqual(result, { status: 'continue' });
    assert.equal(f.calls.length, 0, 'An obsolete identity must not install the CLI or change Skills');
    assert.deepEqual(readBusinessConfig(f.host, 'cli_autosync_fixture'), businesses);
    assert.deepEqual(f.skillTargets.map(target => fs.existsSync(path.join(target.directory, 'ae-dataops'))), [false, false]);
  });
}

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
