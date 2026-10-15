import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { runInstallation } from '../src/core/installation.js';
import { defaultInstallRunner, SKILLS_TOOL, type ProcessRunner } from '../src/core/install-process.js';

// Supply the unpacked, pinned npm package; this test never downloads or changes the user's Skills.
const tool = process.env.AE_TEST_SKILLS_CLI;
test('real pinned Skills tool copies shared files once and retains automatic client support', { skip: !tool }, t => {
  const toolPath = path.resolve(tool!);
  const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(toolPath), '..', 'package.json'), 'utf8'));
  assert.equal(`skills@${pkg.version}`, SKILLS_TOOL);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-skills-real-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const home = path.join(tmp, 'home');
  const globalRoot = path.join(tmp, 'node_modules');
  const packageRoot = path.join(globalRoot, '@tant', 'ae-cli');
  const prefix = path.join(tmp, 'prefix');
  const bin = process.platform === 'win32' ? path.join(prefix, 'ae-cli.cmd') : path.join(prefix, 'bin', 'ae-cli');
  const shared = path.join(home, '.agents', 'skills');
  const log = path.join(tmp, 'operations.json');
  fs.mkdirSync(path.join(home, '.codebuddy'), { recursive: true });
  fs.mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
  fs.mkdirSync(path.dirname(bin), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@tant/ae-cli', version: '6.0.53' }));
  fs.writeFileSync(path.join(packageRoot, 'bin', 'ae-cli.js'), '');
  fs.cpSync(path.resolve('skills'), path.join(packageRoot, 'skills'), { recursive: true });
  if (process.platform === 'win32') {
    const relative = path.relative(prefix, path.join(packageRoot, 'bin', 'ae-cli.js'));
    fs.writeFileSync(bin, `@node "%dp0%\\${relative}" %*`);
  } else fs.symlinkSync(path.join(packageRoot, 'bin', 'ae-cli.js'), bin);
  // Substitute only the child process's home API. Keep the host HOME and credentials untouched.
  const wrapper = path.join(tmp, 'npx.mjs');
  fs.writeFileSync(wrapper, `
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
const home = ${JSON.stringify(home)};
os.homedir = () => home;
for (const key of ['CODEX_HOME', 'CLAUDE_CONFIG_DIR', 'XDG_CONFIG_HOME', 'XDG_STATE_HOME',
  'VIBE_HOME', 'HERMES_HOME', 'AUTOHAND_HOME', 'FLATPAK_XDG_CONFIG_HOME']) delete process.env[key];
process.chdir(home);
const rm = fs.promises.rm, cp = fs.promises.cp;
let clears = 0, copies = 0;
fs.promises.rm = async (target, options) => {
  if (path.dirname(String(target)) === ${JSON.stringify(shared)}) clears++;
  return rm(target, options);
};
fs.promises.cp = async (source, target, options) => {
  if (String(target).startsWith(${JSON.stringify(shared + path.sep)})) copies++;
  return cp(source, target, options);
};
syncBuiltinESMExports();
process.on('exit', () => fs.writeFileSync(${JSON.stringify(log)}, JSON.stringify({ clears, copies, agent: process.env.AI_AGENT })));
process.argv = [process.execPath, ${JSON.stringify(toolPath)}, ...process.argv.slice(4)];
await import(${JSON.stringify(pathToFileURL(toolPath).href)});
`);
  const shim = path.join(tmp, process.platform === 'win32' ? 'npx.cmd' : 'npx');
  fs.writeFileSync(shim, process.platform === 'win32'
    ? `@"${process.execPath}" "${wrapper}" %*\r\n`
    : `#!${process.execPath}\nimport ${JSON.stringify(pathToFileURL(wrapper).href)};\n`, { mode: 0o755 });
  const operations: Array<{ clears: number; copies: number; agent: string }> = [];
  const runner: ProcessRunner = (command, args, timeout) => {
    const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
    if (args[0] === 'root') return ok(globalRoot);
    if (args[0] === 'prefix') return ok(prefix);
    if (args[0] === '--version') return ok(command === bin ? '6.0.53' : '10.8.2');
    assert.ok(args.includes('add'));
    const result = defaultInstallRunner(shim, args, timeout);
    operations.push(JSON.parse(fs.readFileSync(log, 'utf8')));
    return result;
  };
  const run = () => runInstallation({ target: '6.0.53', packageName: '@tant/ae-cli', nodeVersion: '20.19.5',
    runner, skillsDirectory: shared, env: { PATH: path.dirname(bin) } });
  const first = run();
  assert.equal(first.ok, true, JSON.stringify(first));
  const count = first.skills.expected_count;
  assert.equal(count, fs.readdirSync(path.join(packageRoot, 'skills')).filter(name => fs.existsSync(path.join(packageRoot, 'skills', name, 'SKILL.md'))).length);
  assert.equal(operations[0].clears, count);
  assert.ok(operations[0].copies >= count);
  assert.deepEqual(operations[1], { clears: 0, copies: 0, agent: 'ae-cli' });
  const clients = ['.codebuddy', '.claude', '.cursor', '.codex', '.augment'];
  for (const client of clients) fs.mkdirSync(path.join(home, client), { recursive: true });
  // Old per-Skill links must remain readable after distribution changes to copies.
  const skill = 'ae-agent';
  fs.mkdirSync(path.join(home, '.claude', 'skills'), { recursive: true });
  fs.symlinkSync(path.join(shared, skill), path.join(home, '.claude', 'skills', skill), 'junction');
  fs.writeFileSync(path.join(packageRoot, 'skills', skill, 'references', 'test-version.txt'), 'new release');
  fs.mkdirSync(path.join(shared, 'unrelated'), { recursive: true });
  fs.writeFileSync(path.join(shared, 'unrelated', 'SKILL.md'), 'User-owned Skill');
  const repeated = run();
  assert.equal(repeated.ok, true, JSON.stringify(repeated));
  assert.deepEqual(operations[3], { clears: 0, copies: 0, agent: 'ae-cli' });
  for (const client of clients) {
    const directory = ['.cursor', '.codex'].includes(client) ? shared : path.join(home, client, 'skills');
    assert.equal(fs.readFileSync(path.join(directory, skill, 'references', 'test-version.txt'), 'utf8'), 'new release');
    if (directory !== shared) assert.equal(fs.existsSync(path.join(directory, 'unrelated')), false);
  }
  assert.equal(fs.readFileSync(path.join(shared, 'unrelated', 'SKILL.md'), 'utf8'), 'User-owned Skill');
  for (const client of clients) fs.rmSync(path.join(home, client), { recursive: true });
  // With no detected clients the pinned tool tries its full catalog, as before.
  const all = run();
  assert.equal(all.ok, true, JSON.stringify(all));
  assert.deepEqual(operations[5], { clears: 0, copies: 0, agent: 'ae-cli' });
  assert.equal(fs.readFileSync(path.join(home, '.codeium', 'windsurf', 'skills', skill, 'references', 'test-version.txt'), 'utf8'), 'new release');
  t.diagnostic(`${count} shared Skills installed once; CodeBuddy, Claude Code, Cursor, Codex and Augment verified`);
});
