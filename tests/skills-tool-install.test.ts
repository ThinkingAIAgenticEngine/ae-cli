import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { type TestContext } from 'node:test';
import { runInstallation } from '../src/core/installation.js';
import { defaultInstallRunner, SKILLS_TOOL, type ProcessRunner } from '../src/core/install-process.js';
import { createPinnedSkillsTool, skillCopyHash, skillPathIdentity, type SkillsToolOperation, type SkillsToolTarget } from '../src/core/skills-tool.js';

function removalFixture(t: TestContext) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-skills-removal-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'safe-cwd');
  const sourceRoot = path.join(root, 'package', 'skills');
  const skill = 'ae-dataops';
  const source = path.join(sourceRoot, skill);
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.mkdirSync(cwd);
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, 'SKILL.md'), `---\nname: ${skill}\ndescription: Removal fixture\n---\nOriginal content\n`);
  const originalHash = skillCopyHash(source, true)!;
  const adapter = createPinnedSkillsTool({ cwd, env: { ...process.env,
    HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'),
    CODEX_HOME: path.join(home, '.codex'), CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    VIBE_HOME: path.join(home, '.vibe'), HERMES_HOME: path.join(home, '.hermes'),
    AUTOHAND_HOME: path.join(home, '.autohand'), APPDATA: path.join(home, 'appdata'),
    FLATPAK_XDG_CONFIG_HOME: path.join(home, 'flatpak') } });
  const targets = adapter.targets();
  const canonical = targets.find(target => target.agent === 'universal')!;
  const client = targets.find(target => target.agent === 'claude-code')!;
  assert.ok(canonical && client);
  const contextFile = path.join(root, 'context.json');
  const ledgerFile = path.join(root, 'ledger.json');
  const generation = 'fixture-generation';
  fs.writeFileSync(contextFile, JSON.stringify({ generation }));
  const copies: Record<string, { skill: string; agent: string; hash: string; package_version: string }> = {};
  const own = (target: SkillsToolTarget) => {
    copies[path.join(target.directory, skill)] = { skill, agent: target.agent, hash: originalHash, package_version: '6.0.57' };
    fs.writeFileSync(ledgerFile, JSON.stringify({ schema_version: 1, copies }));
  };
  const copy = (target: SkillsToolTarget) => {
    fs.mkdirSync(target.directory, { recursive: true });
    fs.cpSync(source, path.join(target.directory, skill), { recursive: true });
    own(target);
  };
  const plan = (target: SkillsToolTarget, legacyLink?: SkillsToolOperation['legacy_link']): SkillsToolOperation => {
    const file = path.join(target.directory, skill);
    return { action: 'remove', skill, target, source, source_root: sourceRoot,
      expected_hash: originalHash, source_hash: originalHash, expected_node: skillPathIdentity(file),
      ...(legacyLink ? { legacy_link: legacyLink } : {}) };
  };
  return { root, home, sourceRoot, source, skill, adapter, canonical, client, contextFile, ledgerFile,
    copy, own, plan, guard: { file: contextFile, generation, ledger_file: ledgerFile } };
}

test('owned removal ignores edited contents, internal links and an unavailable current package Skill', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const target = path.join(f.canonical.directory, f.skill);
  fs.appendFileSync(path.join(target, 'SKILL.md'), 'User edit\n');
  fs.writeFileSync(path.join(target, 'personal.txt'), 'Extra file');
  const outside = path.join(f.root, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'keep.txt'), 'Keep outside data');
  fs.symlinkSync(outside, path.join(target, 'extra-link'), process.platform === 'win32' ? 'junction' : 'dir');
  const operation = f.plan(f.canonical);
  fs.rmSync(f.sourceRoot, { recursive: true });
  const [receipt] = f.adapter.apply([operation], f.guard);
  assert.equal(receipt.status, 'success', JSON.stringify(receipt));
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8'), 'Keep outside data');
});

test('owned removal retains ownership after an in-place edit made after planning', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const target = path.join(f.canonical.directory, f.skill);
  const operation = f.plan(f.canonical);
  fs.appendFileSync(path.join(target, 'SKILL.md'), 'An edit after planning\n');
  const [receipt] = f.adapter.apply([operation], f.guard);
  assert.equal(receipt.status, 'success', JSON.stringify(receipt));
  assert.equal(skillPathIdentity(target), null);
});

test('owned same-name installer links and an edited canonical copy are removed without source contents', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const canonical = path.join(f.canonical.directory, f.skill);
  const linked = path.join(f.client.directory, f.skill);
  fs.mkdirSync(f.client.directory, { recursive: true });
  const text = process.platform === 'win32' ? canonical : path.relative(path.dirname(linked), canonical);
  fs.symlinkSync(text, linked, process.platform === 'win32' ? 'junction' : 'dir');
  f.own(f.client);
  fs.appendFileSync(path.join(canonical, 'SKILL.md'), 'Modified canonical content\n');
  const operations = [f.plan(f.client, { target: canonical, text: fs.readlinkSync(linked) }), f.plan(f.canonical)];
  fs.rmSync(f.source, { recursive: true });
  const receipts = f.adapter.apply(operations, f.guard);
  assert.ok(receipts.every(receipt => receipt.status === 'success'), JSON.stringify(receipts));
  assert.equal(fs.existsSync(canonical), false);
  assert.throws(() => fs.lstatSync(linked), { code: 'ENOENT' });
});

test('owned installer links are removed even when the canonical installation is already absent', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const canonical = path.join(f.canonical.directory, f.skill);
  const linked = path.join(f.client.directory, f.skill);
  fs.mkdirSync(f.client.directory, { recursive: true });
  fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
  f.own(f.client);
  const operation = f.plan(f.client, { target: canonical, text: fs.readlinkSync(linked) });
  fs.rmSync(canonical, { recursive: true });
  const [receipt] = f.adapter.apply([operation], f.guard);
  assert.equal(receipt.status, 'success', JSON.stringify(receipt));
  assert.equal(skillPathIdentity(linked), null);
});

test('legacy removal rejects a custom bridge link that only lexically resolves to the canonical copy', { skip: process.platform === 'win32' }, t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const canonical = path.join(f.canonical.directory, f.skill);
  const outside = path.join(f.root, 'outside');
  fs.mkdirSync(path.join(outside, 'child'), { recursive: true });
  fs.mkdirSync(path.join(outside, f.skill));
  fs.writeFileSync(path.join(outside, f.skill, 'SKILL.md'), 'Independent outside guidance');
  const bridge = path.join(f.canonical.directory, 'bridge');
  fs.symlinkSync(path.join(outside, 'child'), bridge, 'dir');
  fs.mkdirSync(f.client.directory, { recursive: true });
  const linked = path.join(f.client.directory, f.skill);
  const text = `${path.relative(f.client.directory, bridge)}/../${f.skill}`;
  fs.symlinkSync(text, linked, 'dir');
  assert.equal(path.resolve(f.client.directory, text), canonical);
  assert.equal(fs.readFileSync(path.join(linked, 'SKILL.md'), 'utf8'), 'Independent outside guidance');
  // A mistakenly migrated ledger entry must not bypass the worker's installer-link boundary.
  f.own(f.client);
  const [receipt] = f.adapter.apply([f.plan(f.client, { target: canonical, text })], f.guard);
  assert.equal(receipt.status, 'skipped', JSON.stringify(receipt));
  assert.equal(receipt.reason, 'legacy_link_changed');
  assert.ok(fs.lstatSync(linked).isSymbolicLink());
  assert.ok(fs.existsSync(canonical));
});

test('removal rejects a replacement installer-link node even when its link text is unchanged', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const canonical = path.join(f.canonical.directory, f.skill);
  const linked = path.join(f.client.directory, f.skill);
  fs.mkdirSync(f.client.directory, { recursive: true });
  fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
  f.own(f.client);
  const text = fs.readlinkSync(linked);
  const operation = f.plan(f.client, { target: canonical, text });
  fs.renameSync(linked, path.join(f.client.directory, 'saved-installer-link'));
  fs.symlinkSync(text, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const [receipt] = f.adapter.apply([operation], f.guard);
  assert.equal(receipt.status, 'skipped', JSON.stringify(receipt));
  assert.equal(receipt.reason, 'copy_changed');
  assert.ok(fs.lstatSync(linked).isSymbolicLink());
});

test('owned removal is not vetoed by an unrelated custom alias to that installation', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const canonical = path.join(f.canonical.directory, f.skill);
  fs.mkdirSync(f.client.directory, { recursive: true });
  const alias = path.join(f.client.directory, 'personal-alias');
  fs.symlinkSync(canonical, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const [receipt] = f.adapter.apply([f.plan(f.canonical)], f.guard);
  assert.equal(receipt.status, 'success', JSON.stringify(receipt));
  assert.equal(fs.existsSync(canonical), false);
  assert.equal(fs.lstatSync(alias).isSymbolicLink(), true);
});

test('removal requires exact ledger ownership even when same-named contents match the package', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const operation = f.plan(f.canonical);
  fs.writeFileSync(f.ledgerFile, JSON.stringify({ schema_version: 1, copies: {} }));
  const [receipt] = f.adapter.apply([operation], f.guard);
  assert.equal(receipt.status, 'skipped', JSON.stringify(receipt));
  assert.equal(receipt.reason, 'copy_not_managed');
  assert.ok(fs.existsSync(path.join(f.canonical.directory, f.skill)));
});

test('removal rejects a replaced target node even when its replacement has identical contents', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const target = path.join(f.canonical.directory, f.skill);
  const operation = f.plan(f.canonical);
  fs.renameSync(target, path.join(f.canonical.directory, 'retained-original'));
  fs.cpSync(f.source, target, { recursive: true });
  const [receipt] = f.adapter.apply([operation], f.guard);
  assert.equal(receipt.status, 'skipped', JSON.stringify(receipt));
  assert.equal(receipt.reason, 'copy_changed');
  assert.ok(fs.existsSync(target));
});

test('removal rechecks context and refuses linked parent directories', t => {
  const f = removalFixture(t);
  f.copy(f.canonical);
  const operation = f.plan(f.canonical);
  fs.writeFileSync(f.contextFile, JSON.stringify({ generation: 'newer-context' }));
  const [stale] = f.adapter.apply([operation], f.guard);
  assert.equal(stale.status, 'skipped');
  assert.equal(stale.reason, 'context_changed');
  fs.writeFileSync(f.contextFile, JSON.stringify({ generation: f.guard.generation }));
  const originalDirectory = f.canonical.directory;
  const relocated = path.join(f.root, 'relocated-skills');
  fs.renameSync(originalDirectory, relocated);
  fs.symlinkSync(relocated, originalDirectory, process.platform === 'win32' ? 'junction' : 'dir');
  const [linked] = f.adapter.apply([operation], f.guard);
  assert.equal(linked.status, 'skipped');
  assert.equal(linked.reason, 'copy_parent_linked');
  assert.ok(fs.existsSync(path.join(relocated, f.skill)));
});

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
