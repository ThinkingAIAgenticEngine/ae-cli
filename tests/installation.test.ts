import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { runInstallation, type InstallationOptions } from '../src/core/installation.js';
import { defaultInstallRunner, exactVersion, installHost, SKILLS_TOOL, type ProcessRunner } from '../src/core/install-process.js';

function fixture(t: TestContext, packageName = '@thinkingai/ae-cli', platform = process.platform) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-install-test-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const source = path.join(tmp, 'source');
  const prefix = path.join(tmp, 'prefix with spaces & 中文');
  const globalRoot = platform === 'win32' ? path.join(prefix, 'node_modules') : path.join(prefix, 'lib', 'node_modules');
  const root = path.join(globalRoot, packageName);
  const bin = platform === 'win32' ? path.join(prefix, 'ae-cli.cmd') : path.join(prefix, 'bin', 'ae-cli');
  const skillsDirectory = path.join(tmp, 'home', '.agents', 'skills');
  fs.mkdirSync(path.join(source, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(source, 'dist'));
  fs.writeFileSync(path.join(source, 'bin', 'ae-cli.js'), '#!/usr/bin/env node\n');
  fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({ name: packageName, version: '6.1.9' }));
  for (const name of ['ae-agent', 'mcp2cli']) {
    const dir = path.join(source, 'skills', name);
    fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: "Test Skill"\n---\nBody\n`);
    fs.writeFileSync(path.join(dir, 'references', 'usage.md'), 'Exact release reference\n');
  }
  const names = ['ae-agent', 'mcp2cli'];
  const state = {
    calls: [] as Array<{ command: string; args: string[] }>, installed: false, installedVersion: '',
    installCalls: 0, addCalls: 0, missing: [] as string[], corrupt: [] as string[], stale: [] as string[],
    localFails: false, allFail: false, addStatus: 0, addOutput: '', stderr: '',
    npmError: '', wrongVersion: false, noBin: false, invalidList: false, listNamesOnly: false,
    missingSource: false, auth: false,
  };
  function install(version = '6.1.9') {
    fs.mkdirSync(root, { recursive: true });
    fs.cpSync(source, root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: packageName, version }));
    fs.mkdirSync(path.dirname(bin), { recursive: true });
    if (!state.noBin && !fs.existsSync(bin)) {
      if (platform === 'win32') {
        fs.writeFileSync(bin, `@ECHO off\r\nnode "%dp0%\\node_modules\\${packageName.replace(/\//g, '\\')}\\bin\\ae-cli.js" %*\r\n`);
      } else fs.symlinkSync(path.join(root, 'bin', 'ae-cli.js'), bin);
    }
    if (state.missingSource) fs.rmSync(path.join(root, 'skills'), { recursive: true });
    state.installed = true;
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
      install(args[2].split('@').at(-1)!); return ok();
    }
    if (args.includes('add')) {
      assert.equal(args[1], SKILLS_TOOL);
      if (args.includes('--copy')) {
        assert.equal(args[3], skillsDirectory);
        assert.ok(!args.includes('--agent'));
      } else assert.deepEqual(args.slice(6, 8), ['--agent', 'universal']);
      assert.ok(!args.includes('promptscript'));
      state.addCalls++;
      const remote = args[3].includes('#v');
      if (state.allFail || (state.localFails && !remote && !args.includes('--copy'))) return { status: 1, stdout: '', stderr: 'network timeout' };
      for (const name of names) {
        if (state.missing.includes(name)) continue;
        const target = path.join(skillsDirectory, name);
        fs.mkdirSync(target, { recursive: true });
        fs.cpSync(path.join(source, 'skills', name), target, { recursive: true });
        if (state.corrupt.includes(name)) fs.writeFileSync(path.join(target, 'SKILL.md'), '---\nname: mcp2cli\ndescription: broken: YAML\n---\n');
        if (state.stale.includes(name)) fs.writeFileSync(path.join(target, 'references', 'usage.md'), 'Old release reference');
      }
      return { status: state.addStatus, stdout: state.addOutput, stderr: state.stderr };
    }
    if (args.includes('status')) return ok(JSON.stringify({ ok: true, data: { authenticated: state.auth, token: 'MUST_NOT_LEAK' } }));
    throw new Error('Unexpected subprocess');
  };
  const options: InstallationOptions = { target: '6.1.9', packageName, runner,
    skillsDirectory, nodeVersion: '20.19.5', platform, env: { PATH: path.dirname(bin) } };
  return { tmp, source, root, globalRoot, prefix, bin, skillsDirectory, state, install, runner,
    run: (overrides: InstallationOptions = {}) => runInstallation({ ...options, ...overrides }) };
}

test('Node below 20 fails before subprocesses', t => {
  const f = fixture(t);
  assert.match(f.run({ nodeVersion: '18.20.8' }).error!.message, /Node.js 20/);
  assert.equal(f.state.calls.length, 0);
});

test('fresh install verifies actual global bin and every expected Skill', t => {
  const f = fixture(t); const result = f.run();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.cli.verified, true);
  assert.equal(result.cli.path, f.bin);
  assert.equal(result.skills.installed_count, 2);
  assert.equal(result.skills.source, 'installed-package');
  assert.ok(f.state.calls.some(call => call.command === f.bin && call.args[0] === '--version'));
  assert.equal(f.state.installCalls, 1);
  const addArgs = f.state.calls.find(call => call.args.includes('add'))!.args;
  assert.deepEqual(addArgs.slice(addArgs.indexOf('--skill') + 1), ['ae-agent', 'mcp2cli']);
});

test('shared Skills are installed once before automatic client distribution', t => {
  const f = fixture(t);
  assert.equal(f.run().ok, true);
  const adds = f.state.calls.filter(call => call.args.includes('add'));
  assert.equal(adds.length, 2);
  assert.deepEqual(adds[0].args.slice(6, 8), ['--agent', 'universal']);
  assert.equal(adds[1].args[3], f.skillsDirectory);
  assert.ok(adds[1].args.includes('--copy'));
  assert.ok(!adds[1].args.includes('--agent'));
});

test('client distribution failure retains the shared install and does not retry git', t => {
  const f = fixture(t);
  const result = f.run({ runner: (command, args, timeout) => {
    if (args.includes('--copy')) return { status: 1, stdout: '', stderr: 'EPERM token=SECRET' };
    return f.runner(command, args, timeout);
  } });
  assert.equal(result.ok, false);
  assert.equal(result.error?.stage, 'skills_clients');
  assert.equal(result.error?.cause, 'permission');
  assert.ok(fs.existsSync(path.join(f.skillsDirectory, 'ae-agent', 'SKILL.md')));
  assert.ok(!f.state.calls.some(call => call.args.some(arg => arg.includes('#v'))));
  assert.doesNotMatch(JSON.stringify(result), /SECRET/);
});

test('same version skips npm installation and repeated runs are idempotent', t => {
  const f = fixture(t); f.install();
  assert.equal(f.run().cli.action, 'skipped');
  assert.equal(f.run().ok, true);
  assert.equal(f.state.installCalls, 0);
});

test('older installed version is upgraded', t => {
  const f = fixture(t); f.install('6.1.8');
  assert.equal(f.run().ok, true);
  assert.equal(f.state.installCalls, 1);
});



test('PromptScript false failure is silent after complete global verification', t => {
  const f = fixture(t); f.state.addStatus = 1;
  f.state.addOutput = '✗ ae-agent → PromptScript: PromptScript does not support global skill installation\n✗ mcp2cli → PromptScript: PromptScript does not support global skill installation\nFailed to install 2';
  const result = f.run();
  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result), /PromptScript|unrelated Agent|Failed to install/);
  assert.equal(result.skills.installed_count, 2);
});


test('YAML corruption is a named partial failure even when add exits zero', t => {
  const f = fixture(t); f.state.corrupt = ['mcp2cli'];
  const result = f.run();
  assert.equal(result.ok, false);
  assert.equal(result.cli.verified, true);
  assert.equal(result.skills.status, 'partial');
  assert.equal(result.skills.installed_count, 1);
  assert.deepEqual(result.skills.missing, ['mcp2cli']);
  assert.match(result.skills.failures[0].reason, /YAML/);
});

test('zero exit and names-only lists cannot hide missing Skills', t => {
  const f = fixture(t); f.state.missing = ['mcp2cli']; f.state.listNamesOnly = true;
  const result = f.run();
  assert.equal(result.ok, false);
  assert.deepEqual(result.skills.missing, ['mcp2cli']);
});

test('stale reference files cannot pass as the matching Skills version', t => {
  const f = fixture(t); f.state.stale = ['mcp2cli'];
  assert.match(f.run().skills.failures[0].reason, /files do not match/);
});

test('local failure recovers only through the exact release fallback', t => {
  const f = fixture(t); f.state.localFails = true;
  const result = f.run();
  assert.equal(result.ok, true);
  assert.equal(result.skills.source, 'ThinkingAIAgenticEngine/ae-cli#v6.1.9');
  assert.equal(f.state.addCalls, 3);
});

test('a bundled Skills timeout is not replaced by a fallback network failure', t => {
  const f = fixture(t, '@tant/ae-cli', 'win32');
  const result = f.run({ runner: (command, args, timeout) => {
    if (!args.includes('add')) return f.runner(command, args, timeout);
    if (args[3].includes('#v')) return { status: 1, stdout: '', stderr: 'HTTP 502 network error' };
    return { status: null, stdout: '', stderr: '', error: Object.assign(new Error('spawn ETIMEDOUT'), { code: 'ETIMEDOUT' }) };
  } });
  assert.equal(result.ok, false);
  assert.equal(result.error?.cause, 'timeout');
  assert.equal(result.error?.stage, 'skills_local');
  assert.deepEqual(result.skills.attempts.map(attempt => attempt.cause), ['timeout', 'network']);
  assert.equal(result.skills.attempts[0].source, 'installed-package');
  assert.match(result.skills.attempts[1].source, /#v6\.1\.9$/);
});



test('YAML error diagnostics cannot be masked by old complete files', t => {
  const f = fixture(t); f.state.addOutput = 'SKILL.md YAML parse error';
  assert.equal(f.run().ok, false);
});

test('dry-run makes no subprocess or installation writes', t => {
  const f = fixture(t); const result = f.run({ dryRun: true });
  assert.equal(result.ok, true); assert.equal(result.dry_run, true);
  assert.equal(result.cli.verified, false);
  assert.equal(f.state.calls.length, 0);
  assert.equal(fs.existsSync(f.prefix), false);
  assert.equal(result.commands!.length, 4);
});

test('structured results and logs never forward secrets from subprocesses', t => {
  const f = fixture(t); const logs: string[] = [];
  f.state.stderr = 'token=SECRET cookie=COOKIE app_secret=APP_SECRET';
  const result = f.run({ host: 'https://ae.example.com', progress: message => logs.push(message) });
  assert.equal(result.ok, true);
  assert.equal(result.auth.authenticated, false);
  assert.doesNotMatch(JSON.stringify([result, logs]), /SECRET|COOKIE|MUST_NOT_LEAK/);
  assert.deepEqual(Object.keys(result).sort(), ['auth', 'cli', 'dry_run', 'next_steps', 'ok', 'skills']);
  f.state.npmError = 'EACCES token=SECRET';
  fs.rmSync(f.root, { recursive: true }); fs.unlinkSync(f.bin);
  assert.doesNotMatch(JSON.stringify(f.run()), /SECRET/);
});

test('version and host injection inputs are rejected before executing', t => {
  const f = fixture(t);
  for (const version of ['6.1.9;echo secret', '6.1.9-$(whoami)', '--help', 'latest']) assert.throws(() => exactVersion(version));
  for (const host of ['https://user:SECRET@ae.example', 'https://ae.example?token=SECRET', 'file:///tmp/ae']) assert.throws(() => installHost(host));
  assert.equal(f.state.calls.length, 0);
});

test('version mismatch and npm links are actionable failures', t => {
  const f = fixture(t); f.state.wrongVersion = true;
  assert.match(f.run().error!.message, /--version/);
  f.state.wrongVersion = false;
  fs.rmSync(f.root, { recursive: true });
  fs.symlinkSync(f.source, f.root, 'junction');
  assert.match(f.run().error!.message, /npm-linked/);
});

test('PATH absence warns after absolute executable validation', t => {
  const f = fixture(t); const result = f.run({ env: {} });
  assert.equal(result.ok, true);
  assert.match(result.cli.warnings.join(' '), /PATH/);
});


test('other Skills survive installation', t => {
  const f = fixture(t); const unrelated = path.join(f.skillsDirectory, 'user-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(unrelated), { recursive: true }); fs.writeFileSync(unrelated, 'User content');
  assert.equal(f.run().ok, true);
  assert.equal(fs.readFileSync(unrelated, 'utf8'), 'User content');
});

test('internal installs preserve package, registry, and exact internal fallback', t => {
  const f = fixture(t, '@tant/ae-cli'); f.state.localFails = true;
  const result = f.run();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.cli.package, '@tant/ae-cli');
  const npm = f.state.calls.find(call => call.args[0] === 'install')!;
  assert.deepEqual(npm.args, ['install', '-g', '@tant/ae-cli@6.1.9', '--registry', 'https://npm.thinkingdata.cn:3443']);
  assert.equal(result.skills.source, 'http://10.27.249.150:8888/te-ai/te-cli.git#v6.1.9');
});

test('missing npm bin link is not reported as successful installation', t => {
  const f = fixture(t); f.state.noBin = true;
  const result = f.run();
  assert.equal(result.ok, false);
  assert.match(result.error!.message, /bin-links/);
});

test('authentication checks reuse the verified executable and do not initiate login', t => {
  const f = fixture(t); f.state.auth = true;
  const result = f.run({ host: 'ae.example.com/' });
  assert.equal(result.auth.host, 'https://ae.example.com');
  assert.equal(result.auth.authenticated, true);
  assert.ok(f.state.calls.some(call => call.command === f.bin && call.args.includes('status') && call.args.includes('https://ae.example.com')));
  assert.equal(f.state.calls.some(call => call.args.includes('login')), false);
});



test('a supported client failure is real even when shared Skills exist and the tool exits zero', t => {
  const f = fixture(t);
  f.state.addOutput = 'Failed to install 1\n✗ ae-agent → Claude Code: EACCES';
  const result = f.run();
  assert.equal(result.ok, false);
  assert.match(result.skills.failures[0].reason, /supported client/);
});

test('unrelated warnings do not hide another client error', t => {
  const f = fixture(t);
  f.state.addOutput = 'Failed to install 2\n✗ ae-agent → PromptScript: PromptScript does not support global skill installation\n✗ ae-agent → Claude Code: EACCES';
  assert.equal(f.run().ok, false);
});

test('global installs do not depend on the invoking Agent or a generated manifest', t => {
  const f = fixture(t);
  assert.equal(f.run({ env: {} }).ok, true);
  assert.equal(fs.existsSync(path.join(f.skillsDirectory, 'ae-agent', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(f.root, 'dist', 'skills-manifest.json')), false);
});

test('invalid bundled YAML fails before running the Skills tool', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.source, 'skills', 'mcp2cli', 'SKILL.md'), '---\nname: mcp2cli\ndescription: broken: yaml\n---');
  const result = f.run();
  assert.equal(result.ok, false);
  assert.match(result.error!.message, /mcp2cli.*YAML/);
  assert.equal(f.state.addCalls, 0);
});

test('switches 6.0.50 to 6.0.40 and back using each target package without requiring its install command', t => {
  const f = fixture(t);
  f.install('6.0.50');
  const source = path.join(f.source, 'skills', 'ae-agent', 'references', 'usage.md');
  const installed = path.join(f.skillsDirectory, 'ae-agent', 'references', 'usage.md');
  fs.writeFileSync(source, '6.0.40 reference');
  const down = f.run({ target: '6.0.40' });
  assert.equal(down.ok, true, JSON.stringify(down));
  assert.equal(down.cli.version, '6.0.40');
  assert.equal(fs.readFileSync(installed, 'utf8'), '6.0.40 reference');
  fs.writeFileSync(source, '6.0.50 reference');
  const up = f.run({ target: '6.0.50' });
  assert.equal(up.ok, true, JSON.stringify(up));
  assert.equal(up.cli.version, '6.0.50');
  assert.equal(fs.readFileSync(installed, 'utf8'), '6.0.50 reference');
  assert.deepEqual(f.state.calls.filter(call => call.args[0] === 'install').map(call => call.args[2]),
    ['@thinkingai/ae-cli@6.0.40', '@thinkingai/ae-cli@6.0.50']);
});

for (const packageName of ['@tant/ae-cli', '@thinkingai/ae-cli']) {
  test(`Windows installs and repeats ${packageName} using npm shims and the prefix directory`, t => {
    const f = fixture(t, packageName, 'win32');
    const first = f.run({ env: { Path: `"${f.prefix}"` }, host: 'https://ae.example.com' });
    assert.equal(first.ok, true, JSON.stringify(first));
    assert.equal(first.cli.path, path.join(f.prefix, 'ae-cli.cmd'));
    assert.equal(first.cli.verified, true);
    assert.deepEqual(first.cli.warnings, []);
    assert.equal(first.skills.installed_count, 2);
    assert.ok(f.state.calls.some(call => call.command.endsWith('npm.cmd') && call.args[0] === 'install'));
    assert.ok(f.state.calls.some(call => call.command.endsWith('npx.cmd') && call.args.includes('add')));
    assert.ok(f.state.calls.some(call => call.command === f.bin && call.args[0] === '--version'));
    assert.ok(f.state.calls.some(call => call.command === f.bin && call.args.includes('status')));
    assert.equal(f.run().cli.action, 'skipped');
    assert.equal(f.state.installCalls, 1);
  });
}

test('Windows dry-run requires no subprocesses or installed tools', t => {
  const f = fixture(t, '@tant/ae-cli', 'win32');
  assert.equal(f.run({ dryRun: true }).ok, true);
  assert.equal(f.state.calls.length, 0);
  assert.equal(fs.existsSync(f.prefix), false);
});

test('Windows verifies shim ownership and actual version, including historical npm shims', t => {
  const f = fixture(t, '@tant/ae-cli', 'win32');
  f.install();
  fs.writeFileSync(f.bin, fs.readFileSync(f.bin, 'utf8').replace('%dp0%', '%~dp0'));
  assert.equal(f.run().ok, true);
  f.state.wrongVersion = true;
  assert.match(f.run().error!.message, /--version/);
  f.state.wrongVersion = false;
  fs.writeFileSync(f.bin, '@node "%dp0%\\node_modules\\another-cli\\bin\\ae-cli.js" %*');
  assert.match(f.run().error!.message, /does not belong/);
  f.state.noBin = true;
  fs.unlinkSync(f.bin);
  assert.match(f.run().error!.message, /bin-links/);
});

test('Windows shared installation upgrades and downgrades CLI and Skills together', t => {
  const f = fixture(t, '@tant/ae-cli', 'win32');
  f.install('6.0.50');
  for (const version of ['6.0.40', '6.0.50']) {
    fs.writeFileSync(path.join(f.source, 'skills', 'ae-agent', 'references', 'usage.md'), version);
    const result = f.run({ target: version });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.cli.version, version);
    assert.equal(result.cli.verified, true);
    assert.equal(fs.readFileSync(path.join(f.skillsDirectory, 'ae-agent', 'references', 'usage.md'), 'utf8'), version);
  }
  assert.equal(f.state.installCalls, 2);
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
