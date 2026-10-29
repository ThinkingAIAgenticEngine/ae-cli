import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { runInstallation, type InstallationOptions } from '../src/core/installation.js';
import { defaultInstallRunner, exactVersion, installHost, type ProcessRunner } from '../src/core/install-process.js';
import { reserveBusinessSkillContext, syncBusinessSkills } from '../src/core/business-skill-sync.js';
import { skillCopyHash, type SkillsTool, type SkillsToolOperation } from '../src/core/skills-tool.js';
import { setExternalCliTokenFile } from '../src/core/external-cli-token.js';

function fixture(t: TestContext, packageName = '@thinkingai/ae-cli', platform = process.platform) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-install-test-')));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const source = path.join(tmp, 'source');
  const prefix = path.join(tmp, 'prefix with spaces & 中文');
  const globalRoot = platform === 'win32' ? path.join(prefix, 'node_modules') : path.join(prefix, 'lib', 'node_modules');
  const root = path.join(globalRoot, packageName);
  const bin = platform === 'win32' ? path.join(prefix, 'ae-cli.cmd') : path.join(prefix, 'bin', 'ae-cli');
  const skillsDirectory = path.join(tmp, 'home', '.agents', 'skills');
  const clientDirectory = path.join(tmp, 'home', '.claude', 'skills');
  const stateDirectory = path.join(tmp, 'state');
  const names = ['ae-agent', 'ae-analysis', 'ae-dataops'];
  fs.mkdirSync(path.join(source, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(source, 'dist'));
  fs.writeFileSync(path.join(source, 'bin', 'ae-cli.js'), '#!/usr/bin/env node\n');
  fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({ name: packageName, version: '6.1.9' }));
  for (const name of names) {
    const dir = path.join(source, 'skills', name);
    fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: "Test Skill"\n---\nBody\n`);
    fs.writeFileSync(path.join(dir, 'references', 'usage.md'), 'Exact release reference\n');
  }
  const state = {
    calls: [] as Array<{ command: string; args: string[] }>, installedVersion: '', installCalls: 0,
    syncCalls: [] as string[], operations: [] as SkillsToolOperation[], missing: [] as string[], corrupt: [] as string[],
    npmError: '', wrongVersion: false, noBin: false, auth: false, failClients: false, failTool: false,
    afterNpm: undefined as (() => void) | undefined,
  };
  function install(version = '6.1.9') {
    fs.mkdirSync(root, { recursive: true });
    fs.cpSync(source, root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: packageName, version }));
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    if (!state.noBin && !fs.existsSync(bin)) {
      if (platform === 'win32') fs.writeFileSync(bin, `@node "%dp0%\\node_modules\\${packageName.replace(/\//g, '\\')}\\bin\\ae-cli.js" %*`);
      else fs.symlinkSync(path.join(root, 'bin', 'ae-cli.js'), bin);
    }
    state.installedVersion = version;
  }
  const runner: ProcessRunner = (command, args) => {
    state.calls.push({ command, args });
    const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
    if (args[0] === '--version') return ok(command === bin ? (state.wrongVersion ? '6.1.8' : state.installedVersion) : '10.8.2');
    if (args[0] === 'root') return ok(globalRoot);
    if (args[0] === 'prefix') return ok(prefix);
    if (args[0] === 'install') {
      state.installCalls++;
      if (state.npmError) return { status: 1, stdout: '', stderr: state.npmError };
      install(args[2].split('@').at(-1)!); state.afterNpm?.(); return ok();
    }
    if (args.includes('status')) return ok(JSON.stringify({ ok: true, data: { authenticated: state.auth, token: 'MUST_NOT_LEAK' } }));
    throw new Error('Unexpected subprocess');
  };
  const tool: SkillsTool = {
    targets: () => {
      if (state.failTool) throw new Error('Private tool failure token=SECRET');
      return [{ agent: 'universal', directory: skillsDirectory, detected: true, installable: true },
        { agent: 'fixture-client', directory: clientDirectory, detected: true, installable: true }];
    },
    apply: operations => operations.map(operation => {
      state.operations.push(operation);
      const target = path.join(operation.target.directory, operation.skill);
      const receipt = { action: operation.action, skill: operation.skill, agent: operation.target.agent, path: target };
      if (state.missing.includes(operation.skill) || (state.failClients && operation.target.agent === 'fixture-client')) {
        return { ...receipt, status: 'failed', reason: 'tool_operation_failed' };
      }
      if (operation.action === 'remove') fs.rmSync(target, { recursive: true });
      else {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.rmSync(target, { recursive: true, force: true });
        fs.cpSync(operation.source, target, { recursive: true });
        if (state.corrupt.includes(operation.skill)) fs.writeFileSync(path.join(target, 'SKILL.md'), '---\nname: broken\ndescription: broken: yaml\n---');
      }
      return { ...receipt, status: 'success', ...(operation.action === 'install' ? { hash: skillCopyHash(target)! } : {}) };
    }),
  };
  const options: InstallationOptions = { target: '6.1.9', packageName, runner, skillsDirectory,
    skillStateDirectory: stateDirectory, nodeVersion: '20.19.5', platform, env: { PATH: path.dirname(bin) },
    skillContext: { host: '', tokenFingerprint: '' },
    syncSkills: options => { state.syncCalls.push(options.mode ?? 'sync'); return syncBusinessSkills({ ...options, tool }); } };
  return { tmp, source, root, globalRoot, prefix, bin, skillsDirectory, clientDirectory, stateDirectory, names, state, runner,
    install, run: (extra: InstallationOptions = {}) => runInstallation({ ...options, ...extra }) };
}

test('first installation selects all Skills without an availability snapshot and uses only the managed tool', t => {
  const f = fixture(t); const result = f.run();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.cli.action, 'installed');
  assert.equal(result.cli.verified, true);
  assert.equal(result.cli.path, f.bin);
  assert.equal(result.cli.entrypoint, fs.realpathSync(path.join(f.root, 'bin', 'ae-cli.js')));
  assert.equal(result.skills.expected_count, 3);
  assert.equal(result.skills.installed_count, 3);
  assert.equal(result.skills.source, 'installed-package');
  assert.deepEqual(f.state.syncCalls, ['sync']);
  assert.equal(f.state.operations.length, 6);
  assert.equal(f.state.calls.some(call => call.args.includes('add')), false);
  assert.equal(fs.existsSync(path.join(f.stateDirectory, 'business-config.json')), false);
});

for (const mode of ['environment', 'invalid-environment', 'file-environment', 'file-option', 'sandbox-root', 'sandbox-config', 'fallback-token'] as const) {
  test(`${mode} credentials skip every global Skill stage while keeping CLI verification`, t => {
    const keys = ['HOME', 'AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE', 'SANDBOX_RUNTIME_ROOT', 'TE_AGENT_CLI_CONFIG_DIR'];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    for (const key of keys) delete process.env[key];
    const f = fixture(t); f.install();
    const external = path.join(f.tmp, 'external.json');
    fs.writeFileSync(external, JSON.stringify({ url: 'https://external.example', token: 'cli_external_install_fixture' }));
    if (mode === 'environment' || mode === 'invalid-environment') {
      process.env.AE_CLI_TOKEN = mode === 'environment' ? 'cli_external_install_fixture' : '';
      process.env.AE_CLI_TOKEN_HOST = 'https://external.example';
    } else if (mode === 'file-environment') process.env.AE_CLI_TOKEN_FILE = external;
    else if (mode === 'file-option') setExternalCliTokenFile(external);
    else if (mode === 'sandbox-root') process.env.SANDBOX_RUNTIME_ROOT = path.join(f.tmp, 'sandbox');
    else if (mode === 'sandbox-config') process.env.TE_AGENT_CLI_CONFIG_DIR = path.join(f.tmp, 'sandbox-config');
    else {
      process.env.HOME = f.tmp;
      const fallback = path.join(f.tmp, '.ae-config', 'cli-token.json');
      fs.mkdirSync(path.dirname(fallback), { recursive: true });
      fs.writeFileSync(fallback, JSON.stringify({ url: 'https://sandbox.example', token: 'cli_session_install_fixture' }));
    }
    try {
      // Invalid/missing package Skills must not matter when all global Skill work is skipped.
      fs.rmSync(path.join(f.root, 'skills'), { recursive: true });
      fs.mkdirSync(f.stateDirectory, { recursive: true });
      const context = path.join(f.stateDirectory, 'business-skill-context.json');
      const ledger = path.join(f.stateDirectory, 'business-skills.json');
      fs.writeFileSync(context, 'Existing context');
      fs.writeFileSync(ledger, 'Existing ledger');
      const unrelated = path.join(f.skillsDirectory, 'ae-agent', 'SKILL.md');
      fs.mkdirSync(path.dirname(unrelated), { recursive: true });
      fs.writeFileSync(unrelated, 'Existing global Skill');
      let calls = 0;
      const result = f.run({ syncSkills: () => { calls += 1; throw new Error('Must not synchronize'); } });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.cli.verified, true);
      assert.equal(result.skills.status, 'skipped');
      assert.equal(result.skills.source, null);
      assert.equal(result.skills.expected_count, 0);
      assert.equal(result.skills.attempts.length, 0);
      assert.equal(calls, 0);
      assert.equal(fs.readFileSync(context, 'utf8'), 'Existing context');
      assert.equal(fs.readFileSync(ledger, 'utf8'), 'Existing ledger');
      assert.equal(fs.readFileSync(unrelated, 'utf8'), 'Existing global Skill');
      assert.doesNotMatch(JSON.stringify(result), /cli_external_install_fixture/);
    } finally {
      setExternalCliTokenFile(undefined);
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });
}

test('external credentials do not create a previously absent Skill ledger or context', t => {
  const previousToken = process.env.AE_CLI_TOKEN, previousHost = process.env.AE_CLI_TOKEN_HOST;
  process.env.AE_CLI_TOKEN = 'cli_external_install_fixture';
  process.env.AE_CLI_TOKEN_HOST = 'https://external.example';
  try {
    const f = fixture(t);
    assert.equal(f.run().skills.status, 'skipped');
    assert.equal(fs.existsSync(f.stateDirectory), false);
    assert.equal(fs.existsSync(f.skillsDirectory), false);
  } finally {
    if (previousToken === undefined) delete process.env.AE_CLI_TOKEN; else process.env.AE_CLI_TOKEN = previousToken;
    if (previousHost === undefined) delete process.env.AE_CLI_TOKEN_HOST; else process.env.AE_CLI_TOKEN_HOST = previousHost;
  }
});

test('same version is idempotent and never adopts new copies after the ledger exists', t => {
  const f = fixture(t); f.install();
  assert.equal(f.run().ok, true);
  assert.deepEqual(f.state.syncCalls, ['adopt', 'sync']);
  const operations = f.state.operations.length;
  assert.equal(f.run().ok, true);
  assert.equal(f.state.operations.length, operations);
  assert.deepEqual(f.state.syncCalls, ['adopt', 'sync', 'sync']);
  assert.equal(f.state.installCalls, 0);
});

test('an upgrade cannot reinstall explicitly closed businesses and unknown preserves their absence', t => {
  const f = fixture(t);
  assert.equal(f.run().ok, true);
  assert.equal(f.run({ businesses: { agent: false, dataops: false } }).ok, true);
  assert.equal(fs.existsSync(path.join(f.skillsDirectory, 'ae-agent')), false);
  fs.writeFileSync(path.join(f.source, 'skills', 'ae-analysis', 'references', 'usage.md'), 'New release');
  const result = f.run({ target: '6.1.10', businesses: { agent: false, dataops: false } });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.skills.expected_count, 1);
  assert.equal(fs.existsSync(path.join(f.skillsDirectory, 'ae-agent')), false);
  assert.equal(fs.existsSync(path.join(f.clientDirectory, 'ae-dataops')), false);
  assert.equal(f.run({ target: '6.1.10', businesses: {} }).ok, true);
  assert.equal(fs.existsSync(path.join(f.skillsDirectory, 'ae-agent')), false);
});

test('old exact copies are adopted against the previous package before npm replaces it', t => {
  const f = fixture(t); f.install('6.1.8');
  fs.cpSync(path.join(f.root, 'skills'), f.skillsDirectory, { recursive: true });
  fs.writeFileSync(path.join(f.source, 'skills', 'ae-agent', 'references', 'usage.md'), 'New release');
  const result = f.run();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(f.state.syncCalls, ['adopt', 'sync']);
  assert.equal(fs.readFileSync(path.join(f.skillsDirectory, 'ae-agent', 'references', 'usage.md'), 'utf8'), 'New release');
});

test('user-modified copies survive upgrades and return a named partial result', t => {
  const f = fixture(t); assert.equal(f.run().ok, true);
  const file = path.join(f.skillsDirectory, 'ae-agent', 'references', 'usage.md');
  fs.writeFileSync(file, 'My instructions');
  fs.writeFileSync(path.join(f.source, 'skills', 'ae-agent', 'references', 'usage.md'), 'New release');
  const result = f.run({ target: '6.1.10' });
  assert.equal(result.ok, false);
  assert.equal(result.skills.status, 'partial');
  assert.equal(fs.readFileSync(file, 'utf8'), 'My instructions');
  assert.ok(result.skills.synchronization?.skipped.some(item => item.skill === 'ae-agent' && item.reason === 'copy_modified'));
});

test('legacy migration refuses extra files and later runs do not claim new manual copies', t => {
  const f = fixture(t); f.install();
  fs.cpSync(path.join(f.root, 'skills'), f.skillsDirectory, { recursive: true });
  const note = path.join(f.skillsDirectory, 'ae-agent', 'user-note.md');
  fs.writeFileSync(note, 'Mine');
  const first = f.run({ businesses: { agent: false, dataops: false } });
  assert.equal(first.ok, false);
  assert.equal(fs.readFileSync(note, 'utf8'), 'Mine');
  fs.rmSync(path.join(f.skillsDirectory, 'ae-agent'), { recursive: true });
  fs.cpSync(path.join(f.root, 'skills', 'ae-agent'), path.join(f.skillsDirectory, 'ae-agent'), { recursive: true });
  const second = f.run({ businesses: { agent: false, dataops: false } });
  assert.equal(second.ok, false);
  assert.ok(second.skills.synchronization?.skipped.some(item => item.reason === 'copy_not_managed'));
  assert.equal(fs.existsSync(path.join(f.skillsDirectory, 'ae-agent')), true);
  assert.equal(f.state.syncCalls.filter(mode => mode === 'adopt').length, 1);
});

test('a newer environment reserved during npm prevents the old install from synchronizing Skills', t => {
  const f = fixture(t);
  f.state.afterNpm = () => { reserveBusinessSkillContext({ stateDirectory: f.stateDirectory, host: 'https://newer.example' }); };
  const result = f.run();
  assert.equal(result.ok, false);
  assert.equal(result.cli.verified, true);
  assert.match(result.error!.message, /active environment changed/);
  assert.equal(f.state.operations.length, 0);
});

test('client failures and malformed installed content cannot pass global verification', t => {
  const f = fixture(t); f.state.failClients = true;
  const result = f.run();
  assert.equal(result.ok, false);
  assert.equal(result.skills.status, 'partial');
  assert.equal(fs.existsSync(path.join(f.skillsDirectory, 'ae-analysis', 'SKILL.md')), true);
  assert.equal(f.state.calls.some(call => call.args.some(arg => arg.includes('#v'))), false);
  const other = fixture(t); other.state.corrupt = ['ae-agent'];
  const corrupt = other.run();
  assert.equal(corrupt.ok, false);
  assert.ok(corrupt.skills.failures.some(item => item.skill === 'ae-agent' && /YAML/.test(item.reason)));
});

test('missing copies and managed adapter failures report safe errors without fallback writes', t => {
  const f = fixture(t); f.state.missing = ['ae-agent'];
  assert.deepEqual(f.run().skills.missing, ['ae-agent']);
  const other = fixture(t); other.state.failTool = true;
  const result = other.run();
  assert.equal(result.ok, false);
  assert.equal(result.error!.stage, 'skills_local');
  assert.doesNotMatch(JSON.stringify(result), /SECRET/);
});

test('dry-run is write-free and describes managed package installation rather than raw add commands', t => {
  const f = fixture(t); const result = f.run({ dryRun: true });
  assert.equal(result.ok, true); assert.equal(result.dry_run, true);
  assert.equal(result.cli.verified, false); assert.equal(f.state.calls.length, 0);
  assert.equal(fs.existsSync(f.prefix), false); assert.equal(fs.existsSync(f.stateDirectory), false);
  assert.equal(result.commands!.length, 2);
  assert.doesNotMatch(result.commands!.join(' '), /skills@.* add|#v/);
});

test('structured reports and logs never forward process secrets', t => {
  const f = fixture(t); const logs: string[] = [];
  const result = f.run({ host: 'https://ae.example.com', progress: message => logs.push(message) });
  assert.equal(result.ok, true);
  assert.equal(result.auth.authenticated, false);
  assert.doesNotMatch(JSON.stringify([result, logs]), /MUST_NOT_LEAK/);
  f.state.npmError = 'EACCES token=SECRET';
  fs.rmSync(f.root, { recursive: true }); fs.unlinkSync(f.bin);
  assert.doesNotMatch(JSON.stringify(f.run()), /SECRET/);
});

test('version and host injection inputs are rejected before execution', t => {
  const f = fixture(t);
  for (const version of ['6.1.9;echo secret', '6.1.9-$(whoami)', '--help', 'latest']) assert.throws(() => exactVersion(version));
  for (const host of ['https://user:SECRET@ae.example', 'https://ae.example?token=SECRET', 'file:///tmp/ae']) assert.throws(() => installHost(host));
  assert.equal(f.state.calls.length, 0);
});

test('npm links, executable ownership and wrong versions remain actionable failures', t => {
  const f = fixture(t); f.state.wrongVersion = true;
  assert.match(f.run().error!.message, /--version/);
  f.state.wrongVersion = false; fs.rmSync(f.root, { recursive: true });
  fs.symlinkSync(f.source, f.root, 'junction');
  assert.match(f.run().error!.message, /npm-linked/);
});

test('PATH absence warns after absolute executable validation and unrelated Skills survive', t => {
  const f = fixture(t); const unrelated = path.join(f.skillsDirectory, 'user-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(unrelated), { recursive: true }); fs.writeFileSync(unrelated, 'User content');
  const result = f.run({ env: {} });
  assert.equal(result.ok, true); assert.match(result.cli.warnings.join(' '), /PATH/);
  assert.equal(fs.readFileSync(unrelated, 'utf8'), 'User content');
});

test('internal distribution keeps the official package and registry', t => {
  const f = fixture(t, '@tant/ae-cli'); const result = f.run();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.cli.package, '@tant/ae-cli');
  const npm = f.state.calls.find(call => call.args[0] === 'install')!;
  assert.deepEqual(npm.args, ['install', '-g', '@tant/ae-cli@6.1.9', '--registry', 'https://npm.thinkingdata.cn:3443']);
  assert.equal(result.skills.source, 'installed-package');
});

test('missing executable links and invalid bundled YAML fail before controlled synchronization', t => {
  const f = fixture(t); f.state.noBin = true;
  assert.match(f.run().error!.message, /bin-links/);
  const other = fixture(t);
  fs.writeFileSync(path.join(other.source, 'skills', 'ae-agent', 'SKILL.md'), '---\nname: ae-agent\ndescription: broken: yaml\n---');
  assert.match(other.run().error!.message, /ae-agent.*YAML/);
  assert.equal(other.state.operations.length, 0);
});

test('auth guidance reuses the verified executable and never starts login', t => {
  const f = fixture(t); f.state.auth = true;
  const result = f.run({ host: 'ae.example.com/' });
  assert.equal(result.auth.host, 'https://ae.example.com');
  assert.equal(result.auth.authenticated, true);
  assert.ok(f.state.calls.some(call => call.command === f.bin && call.args.includes('status')));
  assert.equal(f.state.calls.some(call => call.args.includes('login')), false);
});

for (const packageName of ['@tant/ae-cli', '@thinkingai/ae-cli']) {
  test(`Windows shim checks and repeated managed installation work for ${packageName}`, t => {
    const f = fixture(t, packageName, 'win32');
    const first = f.run({ env: { Path: `"${f.prefix}"` }, host: 'https://ae.example.com' });
    assert.equal(first.ok, true, JSON.stringify(first));
    assert.equal(first.cli.path, path.join(f.prefix, 'ae-cli.cmd'));
    assert.equal(first.cli.entrypoint, fs.realpathSync(path.join(f.root, 'bin', 'ae-cli.js')));
    assert.equal(first.cli.verified, true);
    assert.deepEqual(first.cli.warnings, []);
    assert.equal(first.skills.installed_count, 3);
    assert.equal(f.run().cli.action, 'skipped');
    assert.equal(f.state.installCalls, 1);
    fs.writeFileSync(f.bin, fs.readFileSync(f.bin, 'utf8').replace('%dp0%', '%~dp0'));
    assert.equal(f.run().ok, true);
    fs.writeFileSync(f.bin, '@node "%dp0%\\node_modules\\another-cli\\bin\\ae-cli.js" %*');
    assert.match(f.run().error!.message, /does not belong/);
  });
}

test('upgrade and downgrade keep matching managed Skill references', t => {
  const f = fixture(t); assert.equal(f.run().ok, true);
  for (const version of ['6.0.40', '6.0.50']) {
    fs.writeFileSync(path.join(f.source, 'skills', 'ae-agent', 'references', 'usage.md'), version);
    const result = f.run({ target: version });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(fs.readFileSync(path.join(f.skillsDirectory, 'ae-agent', 'references', 'usage.md'), 'utf8'), version);
  }
});

test('process runner preserves argument boundaries and nonzero exit codes', () => {
  const args = ['path with spaces/中文', 'a&b', 'a(b)', 'a"b', '%PATH%'];
  const result = defaultInstallRunner(process.execPath, ['-e', 'console.log(JSON.stringify(process.argv.slice(1))); process.exitCode = 7', ...args], 15_000);
  assert.equal(result.status, 7);
  assert.deepEqual(JSON.parse(result.stdout), args);
});

test('Windows configuration uses the user home when HOME is absent and preserves an explicit HOME', () => {
  const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/core/config.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  for (const env of [{}, { HOME: 'D:\\legacy-home' }]) {
    const directory = runInNewContext(`${compiled}\nexports.getConfigDir()`, {
      exports: {}, process: { env },
      require: (name: string) => {
        if (name === 'path') return path.win32;
        if (name === 'node:os') return { homedir: () => 'C:\\Users\\tester' };
        return {};
      },
    });
    assert.equal(directory, path.win32.join(env.HOME ?? 'C:\\Users\\tester', '.ae-cli'));
  }
});

test('native Windows runner executes cmd shims from paths with spaces', { skip: process.platform !== 'win32' }, t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ae cmd 中文 '));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const script = path.join(tmp, 'echo.js');
  const shim = path.join(tmp, 'echo.cmd');
  fs.writeFileSync(script, 'console.log(JSON.stringify(process.argv.slice(2))); process.exitCode = 7;');
  fs.writeFileSync(shim, `@echo off\r\n"${process.execPath}" "%~dp0\\echo.js" %*\r\n`);
  const args = ['path with spaces/中文', 'a&b', 'a(b)'];
  const result = defaultInstallRunner(shim, args, 15_000);
  assert.equal(result.status, 7, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), args);
});
