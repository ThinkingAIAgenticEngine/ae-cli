import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { syncBusinessSkills, reserveBusinessSkillContext, isBusinessSkillContextCurrent, type BusinessSkillSyncOptions } from '../src/core/business-skill-sync.js';
import { createPinnedSkillsTool, skillCopyHash, skillPathProblem, type SkillsTool, type SkillsToolTarget } from '../src/core/skills-tool.js';
import { readBundledSkills } from '../src/core/skills-install.js';

function fixture(t: TestContext) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-business-skills-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'safe-cwd');
  const source = path.join(root, 'package', 'skills');
  fs.mkdirSync(cwd, { recursive: true });
  fs.mkdirSync(home);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_STATE_HOME: path.join(home, '.local', 'state'),
    CODEX_HOME: path.join(home, '.codex'), CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    VIBE_HOME: path.join(home, '.vibe'), HERMES_HOME: path.join(home, '.hermes'),
    AUTOHAND_HOME: path.join(home, '.autohand'), APPDATA: path.join(home, 'appdata'),
    FLATPAK_XDG_CONFIG_HOME: path.join(home, 'flatpak') };
  for (const client of ['.codex', '.claude', '.cursor']) fs.mkdirSync(path.join(home, client));
  for (const name of ['ae-analysis', 'ae-dataops', 'ae-engage', 'ae-agent', 'ae-community']) {
    const directory = path.join(source, name);
    fs.mkdirSync(path.join(directory, 'references'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'SKILL.md'), `---\nname: ${name}\ndescription: A complete test Skill\n---\nContent\n`);
    fs.writeFileSync(path.join(directory, 'references', 'usage.md'), `Complete source for ${name}\n`);
  }
  const tool = createPinnedSkillsTool({ env, cwd });
  const allTargets = tool.targets();
  const targets = ['universal', 'codex', 'claude-code', 'cursor'].map(agent => {
    const target = allTargets.find(target => target.agent === agent);
    assert.ok(target, `Missing upstream registry entry ${agent}`);
    assert.ok(target.directory.startsWith(home + path.sep));
    return target;
  });
  const installTargets = targets.filter(target => target.installable);
  const options: BusinessSkillSyncOptions = { skillsDirectory: source, businesses: {}, host: 'https://one.example.test',
    tokenFingerprint: createHash('sha256').update('first account').digest('hex'),
    stateDirectory: path.join(root, 'state'), tool, env, packageVersion: '6.0.56' };
  const copy = (name: string, target: SkillsToolTarget) => {
    fs.mkdirSync(target.directory, { recursive: true });
    fs.cpSync(path.join(source, name), path.join(target.directory, name), { recursive: true });
  };
  const installFixture = (name = 'ae-dataops') => { for (const target of targets) copy(name, target); };
  const run = (overrides: Partial<BusinessSkillSyncOptions> = {}) => syncBusinessSkills({ ...options, ...overrides });
  return { root, home, cwd, source, env, tool, targets, installTargets, allTargets, options, copy, installFixture, run };
}

test('fresh installations follow upstream canonical paths without creating legacy copies', t => {
  const f = fixture(t);
  assert.deepEqual(f.installTargets.map(target => target.agent), ['universal', 'claude-code']);
  const businesses = { dataops: true, engage: true, agent: true, community: true };
  const report = f.run({ businesses });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.installed.length, 10);
  for (const target of f.targets) {
    assert.equal(fs.existsSync(path.join(target.directory, 'ae-dataops')), target.installable);
    if (!target.installable) {
      assert.equal(fs.existsSync(target.directory), false);
      fs.mkdirSync(target.directory, { recursive: true });
    }
  }
  // An existing empty legacy directory does not become an installation target either.
  assert.equal(f.run({ businesses }).installed.length, 0);
  for (const target of f.targets.filter(target => !target.installable)) assert.deepEqual(fs.readdirSync(target.directory), []);
  // Independent clients retain the directory chosen by the upstream installer.
  fs.mkdirSync(path.join(f.home, '.codebuddy'));
  const independent = f.tool.targets().find(target => target.agent === 'codebuddy')!;
  assert.equal(independent.installable, true);
  assert.equal(f.run({ businesses }).installed.filter(copy => copy.agent === 'codebuddy').length, 5);
  assert.ok(fs.existsSync(path.join(independent.directory, 'ae-dataops', 'references', 'usage.md')));
});

test('AI monitor follows Agent false, true and unknown states after user edits', t => {
  const f = fixture(t);
  const source = path.join(f.source, 'ae-ai-monitor');
  fs.mkdirSync(path.join(source, 'references'), { recursive: true });
  fs.writeFileSync(path.join(source, 'SKILL.md'), '---\nname: ae-ai-monitor\ndescription: AI monitor availability fixture\n---\nInstructions\n');
  fs.writeFileSync(path.join(source, 'references', 'usage.md'), 'Package monitor instructions\n');
  assert.equal(f.run({ businesses: { agent: true } }).status, 'success');
  for (const target of f.installTargets) {
    fs.writeFileSync(path.join(target.directory, 'ae-ai-monitor', 'references', 'usage.md'), 'User monitor instructions');
  }
  const closed = f.run({ businesses: { agent: false } });
  assert.equal(closed.status, 'success', JSON.stringify(closed));
  assert.equal(closed.removed.filter(copy => copy.skill === 'ae-ai-monitor').length, f.installTargets.length);
  for (const target of f.installTargets) assert.equal(fs.existsSync(path.join(target.directory, 'ae-ai-monitor')), false);
  const opened = f.run({ businesses: { agent: true } });
  assert.equal(opened.status, 'success', JSON.stringify(opened));
  assert.equal(opened.installed.filter(copy => copy.skill === 'ae-ai-monitor').length, f.installTargets.length);
  for (const target of f.installTargets) assert.equal(skillCopyHash(path.join(target.directory, 'ae-ai-monitor')), skillCopyHash(source, true));
  const retained = path.join(f.installTargets[0].directory, 'ae-ai-monitor', 'references', 'usage.md');
  fs.writeFileSync(retained, 'Personal monitor guidance');
  const missing = path.join(f.installTargets[1].directory, 'ae-ai-monitor');
  fs.rmSync(missing, { recursive: true });
  const unknown = f.run({ businesses: {} });
  assert.equal(unknown.status, 'success', JSON.stringify(unknown));
  assert.equal(unknown.removed.filter(copy => copy.skill === 'ae-ai-monitor').length, 0);
  assert.equal(unknown.installed.filter(copy => copy.skill === 'ae-ai-monitor').length, 0);
  assert.equal(fs.readFileSync(retained, 'utf8'), 'Personal monitor guidance');
  assert.equal(fs.existsSync(missing), false);
});

test('AI monitor mapping invalidates a successful base-policy snapshot before removing edited owned copies', t => {
  const f = fixture(t);
  const source = path.join(f.source, 'ae-ai-monitor');
  fs.mkdirSync(path.join(source, 'references'), { recursive: true });
  fs.writeFileSync(path.join(source, 'SKILL.md'), '---\nname: ae-ai-monitor\ndescription: Former base Skill fixture\n---\nInstructions\n');
  fs.writeFileSync(path.join(source, 'references', 'usage.md'), 'Package monitor instructions\n');
  assert.equal(f.run({ businesses: { agent: false } }).status, 'success');
  for (const target of f.installTargets) f.copy('ae-ai-monitor', target);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const file = path.join(f.options.stateDirectory!, 'business-skills.json');
  const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Frozen successful 6.0 base mapping before ae-ai-monitor moved to Agent.
  const oldBasePolicy = 'a8f3342e5d39eface563b04a68184a81544ad47677ddf3190e7cdd19d42416a0';
  ledger.last_applied.policy_hash = oldBasePolicy;
  fs.writeFileSync(file, JSON.stringify(ledger));
  for (const target of f.installTargets) {
    fs.writeFileSync(path.join(target.directory, 'ae-ai-monitor', 'references', 'usage.md'), 'Edited former base Skill');
  }
  const report = f.run({ businesses: { agent: false }, onlyIfChanged: true });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-ai-monitor').length, f.installTargets.length);
  for (const target of f.installTargets) assert.equal(fs.existsSync(path.join(target.directory, 'ae-ai-monitor')), false);
  assert.notEqual(JSON.parse(fs.readFileSync(file, 'utf8')).last_applied.policy_hash, oldBasePolicy);
});

test('the worker refuses new copies in a legacy registry target', t => {
  const f = fixture(t);
  const target = f.targets.find(target => !target.installable)!;
  const source = path.join(f.source, 'ae-dataops');
  const generation = reserveBusinessSkillContext(f.options);
  const [receipt] = f.tool.apply([{ action: 'install', skill: 'ae-dataops', target, source, source_root: f.source,
    expected_hash: null, source_hash: skillCopyHash(source, true)! }], {
    file: path.join(f.options.stateDirectory!, 'business-skill-context.json'), generation,
  });
  assert.equal(receipt.status, 'skipped');
  assert.equal(receipt.reason, 'legacy_target_missing');
  assert.equal(fs.existsSync(target.directory), false);
});

test('adopts every matching registry copy without using the merged list output', t => {
  const f = fixture(t);
  f.installFixture();
  const report = f.run({ mode: 'adopt' });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.deepEqual(report.adopted.map(copy => copy.path).sort(), f.targets.map(target => path.join(target.directory, 'ae-dataops')).sort());
  assert.equal(report.managed_count, 4);
  assert.ok(!f.allTargets.some(target => ['eve', 'promptscript'].includes(target.agent)));
  assert.ok(!fs.existsSync(path.join(f.cwd, '.promptscript')));
});

test('false removes CLI-owned copies even after the user adds files', t => {
  const f = fixture(t);
  f.installFixture();
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const modified = path.join(f.targets.find(target => target.agent === 'codex')!.directory, 'ae-dataops');
  fs.writeFileSync(path.join(modified, 'personal.md'), 'Keep this addition');
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 4);
  assert.equal(report.skipped.length, 0);
  for (const target of f.targets) assert.equal(fs.existsSync(path.join(target.directory, 'ae-dataops')), false);
  assert.ok(!fs.existsSync(path.join(f.cwd, '.promptscript')));
});

test('false removes edited CLI-owned metadata and internal links without following their targets', t => {
  const f = fixture(t);
  f.installFixture();
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const external = path.join(f.root, 'personal-reference');
  fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, 'usage.md'), 'Independent user reference\n');
  for (const target of f.targets) {
    const copy = path.join(target.directory, 'ae-dataops');
    fs.writeFileSync(path.join(copy, 'SKILL.md'), 'User replaced the installed instructions');
    fs.symlinkSync(external, path.join(copy, 'references', 'personal'), process.platform === 'win32' ? 'junction' : 'dir');
  }
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, f.targets.length);
  for (const target of f.targets) assert.equal(fs.existsSync(path.join(target.directory, 'ae-dataops')), false);
  assert.equal(fs.readFileSync(path.join(external, 'usage.md'), 'utf8'), 'Independent user reference\n');
});

test('false removes an owned mapped copy that is absent from the current bundle', t => {
  const f = fixture(t);
  f.installFixture();
  f.copy('ae-analysis', f.targets[0]);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  fs.rmSync(path.join(f.source, 'ae-dataops'), { recursive: true });
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, f.targets.length);
  for (const target of f.targets) assert.equal(fs.existsSync(path.join(target.directory, 'ae-dataops')), false);
  assert.ok(fs.existsSync(path.join(f.targets[0].directory, 'ae-analysis', 'SKILL.md')));
});

function writeHistoricalSkillLock(f: ReturnType<typeof fixture>, entries: Record<string, object>): void {
  const file = f.env.XDG_STATE_HOME ? path.join(f.env.XDG_STATE_HOME, 'skills', '.skill-lock.json')
    : path.join(f.home, '.agents', '.skill-lock.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ version: 3, skills: entries }));
}

function installHistoricalSkillLinks(f: ReturnType<typeof fixture>, name = 'ae-dataops'): void {
  const canonicalTarget = f.targets.find(target => target.agent === 'universal')!;
  f.copy(name, canonicalTarget);
  const canonical = path.join(canonicalTarget.directory, name);
  for (const target of f.targets.filter(item => item !== canonicalTarget)) {
    const linked = path.join(target.directory, name);
    fs.mkdirSync(target.directory, { recursive: true });
    fs.symlinkSync(process.platform === 'win32' ? canonical : path.relative(target.directory, canonical), linked,
      process.platform === 'win32' ? 'junction' : 'dir');
  }
}

for (const xdg of [false, true]) {
  test(`historical ${xdg ? 'XDG' : 'home'} CLI provenance fills an existing ledger without requiring pristine contents`, t => {
    const f = fixture(t);
    if (!xdg) delete f.env.XDG_STATE_HOME;
    f.copy('ae-analysis', f.targets[0]);
    assert.equal(f.run({ mode: 'adopt' }).status, 'success');
    installHistoricalSkillLinks(f);
    fs.writeFileSync(path.join(f.targets[0].directory, 'ae-dataops', 'references', 'usage.md'), 'Edited historical CLI copy\n');
    writeHistoricalSkillLock(f, { 'ae-dataops': {
      source: f.source, sourceType: 'local', sourceUrl: f.source, skillPath: 'ae-dataops/SKILL.md',
      skillFolderHash: xdg ? '' : 'f'.repeat(40), installedAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    } });
    const report = f.run({ businesses: { dataops: false } });
    assert.equal(report.status, 'success', JSON.stringify(report));
    assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, f.targets.length);
    for (const target of f.targets) assert.throws(() => fs.lstatSync(path.join(target.directory, 'ae-dataops')), { code: 'ENOENT' });
    assert.ok(fs.existsSync(path.join(f.targets[0].directory, 'ae-analysis', 'SKILL.md')));
  });
}

for (const existingLock of [false, true]) {
  test(`${existingLock ? 'updated' : 'new'} historical CLI provenance invalidates an unchanged-business fast path`, t => {
    const f = fixture(t);
    if (existingLock) writeHistoricalSkillLock(f, { 'ae-dataops': {
      source: 'https://github.com/example/personal-skills', sourceType: 'git',
      sourceUrl: 'https://github.com/example/personal-skills', skillPath: 'ae-dataops/SKILL.md', skillFolderHash: '',
    } });
    assert.equal(f.run({ businesses: { dataops: false } }).status, 'success');
    installHistoricalSkillLinks(f);
    fs.writeFileSync(path.join(f.targets[0].directory, 'ae-dataops', 'personal.md'), 'Historical user edit');
    writeHistoricalSkillLock(f, { 'ae-dataops': {
      source: f.source, sourceType: 'local', sourceUrl: f.source, skillPath: 'ae-dataops/SKILL.md',
      skillFolderHash: '', updatedAt: '2026-11-05T10:00:00Z',
    } });
    const report = f.run({ businesses: { dataops: false }, onlyIfChanged: true });
    assert.equal(report.status, 'success', JSON.stringify(report));
    assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, f.targets.length);
    for (const target of f.targets) assert.throws(() => fs.lstatSync(path.join(target.directory, 'ae-dataops')), { code: 'ENOENT' });
    const repeated = f.run({ businesses: { dataops: false }, onlyIfChanged: true });
    assert.equal(repeated.status, 'success', JSON.stringify(repeated));
    assert.equal(repeated.removed.length, 0);
    assert.equal(repeated.installed.length, 0);
  });
}

test('historical CLI package provenance can remove a retired mapped Skill with user edits', t => {
  const f = fixture(t);
  f.copy('ae-analysis', f.targets[0]);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  installHistoricalSkillLinks(f);
  const previousPackage = path.join(f.root, 'previous-cli-package');
  const previousSkills = path.join(previousPackage, 'skills');
  fs.mkdirSync(previousSkills, { recursive: true });
  fs.writeFileSync(path.join(previousPackage, 'package.json'), JSON.stringify({
    name: '@tant/ae-cli', version: '6.0.45', bin: { 'ae-cli': 'bin/ae-cli.js' },
  }));
  fs.writeFileSync(path.join(f.targets[0].directory, 'ae-dataops', 'personal.md'), 'Personal addition');
  fs.rmSync(path.join(f.source, 'ae-dataops'), { recursive: true });
  writeHistoricalSkillLock(f, { 'ae-dataops': {
    source: previousSkills, sourceType: 'local', sourceUrl: previousSkills, skillPath: 'ae-dataops/SKILL.md', skillFolderHash: '',
  } });
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, f.targets.length);
  for (const target of f.targets) assert.throws(() => fs.lstatSync(path.join(target.directory, 'ae-dataops')), { code: 'ENOENT' });
});

test('a global CLI source record cannot claim an independent ordinary client copy', t => {
  const f = fixture(t);
  const canonicalTarget = f.targets.find(target => target.agent === 'universal')!;
  f.copy('ae-dataops', canonicalTarget);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const independentTarget = f.targets.find(target => target.agent === 'claude-code')!;
  f.copy('ae-dataops', independentTarget);
  const independent = path.join(independentTarget.directory, 'ae-dataops');
  fs.writeFileSync(path.join(independent, 'references', 'usage.md'), 'Independently installed personal instructions');
  writeHistoricalSkillLock(f, { 'ae-dataops': {
    source: f.source, sourceType: 'local', sourceUrl: f.source, skillPath: 'ae-dataops/SKILL.md', skillFolderHash: '',
  } });
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'partial', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 1);
  assert.equal(fs.existsSync(path.join(canonicalTarget.directory, 'ae-dataops')), false);
  assert.ok(report.skipped.some(copy => copy.path === independent && copy.reason === 'copy_not_managed'));
  assert.ok(fs.lstatSync(independent).isDirectory());
  assert.equal(fs.readFileSync(path.join(independent, 'references', 'usage.md'), 'utf8'), 'Independently installed personal instructions');
});

test('a bridge-parent link that only lexically names the owned canonical Skill is not an installer link',
  { skip: process.platform === 'win32' }, t => {
    const f = fixture(t);
    const canonicalTarget = f.targets.find(target => target.agent === 'universal')!;
    f.copy('ae-dataops', canonicalTarget);
    assert.equal(f.run({ mode: 'adopt' }).status, 'success');
    const canonical = path.join(canonicalTarget.directory, 'ae-dataops');
    const externalRoot = path.join(f.root, 'independent-skills');
    fs.mkdirSync(path.join(externalRoot, 'bridge-child'), { recursive: true });
    const external = path.join(externalRoot, 'ae-dataops');
    fs.cpSync(path.join(f.source, 'ae-dataops'), external, { recursive: true });
    const externalContent = 'Independent Skill reached through POSIX symlink traversal';
    fs.writeFileSync(path.join(external, 'references', 'usage.md'), externalContent);
    fs.symlinkSync(path.join(externalRoot, 'bridge-child'), path.join(canonicalTarget.directory, 'bridge'), 'dir');
    const client = f.targets.find(target => target.agent === 'claude-code')!;
    fs.mkdirSync(client.directory, { recursive: true });
    const linked = path.join(client.directory, 'ae-dataops');
    const linkText = `${path.relative(client.directory, canonicalTarget.directory)}/bridge/../ae-dataops`;
    fs.symlinkSync(linkText, linked, 'dir');
    assert.equal(path.resolve(client.directory, linkText), canonical);
    assert.equal(fs.realpathSync.native(linked), external);
    assert.equal(fs.readFileSync(path.join(linked, 'references', 'usage.md'), 'utf8'), externalContent);
    writeHistoricalSkillLock(f, { 'ae-dataops': {
      source: f.source, sourceType: 'local', sourceUrl: f.source, skillPath: 'ae-dataops/SKILL.md', skillFolderHash: '',
    } });
    const report = f.run({ businesses: { dataops: false } });
    assert.equal(report.status, 'partial', JSON.stringify(report));
    assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 1);
    assert.equal(fs.existsSync(canonical), false);
    assert.ok(report.skipped.some(copy => copy.path === linked));
    assert.ok(fs.lstatSync(linked).isSymbolicLink());
    assert.equal(fs.readlinkSync(linked), linkText);
    assert.equal(fs.realpathSync.native(linked), external);
    assert.equal(fs.readFileSync(path.join(external, 'references', 'usage.md'), 'utf8'), externalContent);
  });

for (const source of ['https://github.com/example/personal-skills', 'independent-local-source']) {
  test(`a historical lock from ${source} cannot claim same-named user Skills`, t => {
    const f = fixture(t);
    assert.equal(f.run({ mode: 'adopt' }).status, 'success');
    f.installFixture();
    const sourceUrl = source.startsWith('https:') ? source : path.join(f.root, source);
    writeHistoricalSkillLock(f, { 'ae-dataops': {
      source: sourceUrl, sourceType: source.startsWith('https:') ? 'git' : 'local', sourceUrl,
      skillPath: 'ae-dataops/SKILL.md', skillFolderHash: '',
    } });
    const report = f.run({ businesses: { dataops: false } });
    assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 0);
    for (const target of f.targets) assert.ok(fs.existsSync(path.join(target.directory, 'ae-dataops', 'SKILL.md')));
  });
}

test('CLI provenance does not make an unmapped personal Skill eligible for business removal', t => {
  const f = fixture(t);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const name = 'ae-personal-guidance';
  const copy = path.join(f.targets[0].directory, name);
  fs.mkdirSync(copy, { recursive: true });
  fs.writeFileSync(path.join(copy, 'SKILL.md'), `---\nname: ${name}\ndescription: Personal guidance\n---\nPersonal instructions\n`);
  writeHistoricalSkillLock(f, { [name]: {
    source: f.source, sourceType: 'local', sourceUrl: f.source, skillPath: `${name}/SKILL.md`, skillFolderHash: '',
  } });
  const report = f.run({ businesses: { dataops: false, engage: false, agent: false, community: false } });
  assert.equal(report.removed.filter(item => item.skill === name).length, 0);
  assert.equal(fs.readFileSync(path.join(copy, 'SKILL.md'), 'utf8'), `---\nname: ${name}\ndescription: Personal guidance\n---\nPersonal instructions\n`);
});

test('historical CLI provenance cannot claim a same-name link into the package source', t => {
  const f = fixture(t);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const linked = path.join(f.targets[0].directory, 'ae-dataops');
  fs.mkdirSync(path.dirname(linked), { recursive: true });
  fs.symlinkSync(path.join(f.source, 'ae-dataops'), linked, process.platform === 'win32' ? 'junction' : 'dir');
  writeHistoricalSkillLock(f, { 'ae-dataops': {
    source: f.source, sourceType: 'local', sourceUrl: f.source, skillPath: 'ae-dataops/SKILL.md', skillFolderHash: '',
  } });
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 0);
  assert.ok(fs.lstatSync(linked).isSymbolicLink());
  assert.equal(fs.readFileSync(path.join(f.source, 'ae-dataops', 'references', 'usage.md'), 'utf8'), 'Complete source for ae-dataops\n');
});

test('historical CLI provenance cannot claim copies below a linked parent directory', t => {
  const f = fixture(t);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const independent = path.join(f.root, 'personal-skills');
  fs.mkdirSync(independent);
  fs.cpSync(path.join(f.source, 'ae-dataops'), path.join(independent, 'ae-dataops'), { recursive: true });
  const target = f.targets.find(item => item.agent === 'claude-code')!;
  fs.symlinkSync(independent, target.directory, process.platform === 'win32' ? 'junction' : 'dir');
  writeHistoricalSkillLock(f, { 'ae-dataops': {
    source: f.source, sourceType: 'local', sourceUrl: f.source, skillPath: 'ae-dataops/SKILL.md', skillFolderHash: '',
  } });
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 0);
  assert.ok(fs.lstatSync(target.directory).isSymbolicLink());
  assert.equal(fs.readFileSync(path.join(independent, 'ae-dataops', 'references', 'usage.md'), 'utf8'), 'Complete source for ae-dataops\n');
});

test('true restores canonical copies without recreating removed legacy copies', t => {
  const f = fixture(t);
  f.installFixture();
  f.run({ mode: 'adopt' });
  const removed = f.run({ businesses: { dataops: false } });
  assert.equal(removed.removed.filter(copy => copy.skill === 'ae-dataops').length, 4, JSON.stringify(removed));
  const restored = f.run({ businesses: { dataops: true } });
  assert.equal(restored.status, 'success', JSON.stringify(restored));
  assert.equal(restored.installed.filter(copy => copy.skill === 'ae-dataops').length, 2);
  for (const target of f.targets) {
    if (!target.installable) {
      assert.equal(fs.existsSync(path.join(target.directory, 'ae-dataops')), false);
      continue;
    }
    assert.equal(skillCopyHash(path.join(target.directory, 'ae-dataops')), skillCopyHash(path.join(f.source, 'ae-dataops'), true));
    assert.equal(fs.readFileSync(path.join(target.directory, 'ae-dataops', 'references', 'usage.md'), 'utf8'), 'Complete source for ae-dataops\n');
  }
});

test('automatic refresh skips an applied state before discovering targets or scanning copies', t => {
  const f = fixture(t);
  assert.equal(f.run({ businesses: { agent: false, dataops: true } }).status, 'success');
  const ledger = path.join(f.options.stateDirectory!, 'business-skills.json');
  const before = fs.readFileSync(ledger, 'utf8');
  const unused: SkillsTool = {
    targets() { assert.fail('Unchanged businesses must not rescan client targets'); },
    apply() { assert.fail('Unchanged businesses must not run the installer'); },
  };
  assert.equal(f.run({ businesses: { dataops: true, agent: false }, onlyIfChanged: true, tool: unused }).status, 'success');
  assert.equal(fs.readFileSync(ledger, 'utf8'), before);
  assert.ok(!before.includes('first account'));
});

test('a partial transition invalidates the old applied state even if config returns to it', t => {
  const f = fixture(t);
  assert.equal(f.run({ businesses: { dataops: false } }).status, 'success');
  const interrupted: SkillsTool = {
    targets: () => f.tool.targets(),
    apply(operations, guard) {
      return [...f.tool.apply(operations.slice(0, 1), guard), ...operations.slice(1).map(operation => ({
        action: operation.action, skill: operation.skill, agent: operation.target.agent,
        path: path.join(operation.target.directory, operation.skill), status: 'failed' as const,
      }))];
    },
  };
  assert.equal(f.run({ businesses: { dataops: true }, onlyIfChanged: true, tool: interrupted }).status, 'partial');
  assert.ok(f.installTargets.some(target => fs.existsSync(path.join(target.directory, 'ae-dataops'))));
  const ledger = path.join(f.options.stateDirectory!, 'business-skills.json');
  assert.equal(JSON.parse(fs.readFileSync(ledger, 'utf8')).last_applied, undefined);
  const resources = recordResourceReads(t);
  assert.equal(f.run({ businesses: { dataops: false }, onlyIfChanged: true }).status, 'success');
  assert.ok(resources.some(file => file.includes(`${path.sep}ae-analysis${path.sep}`)), 'A partial transition must force a complete verification next time');
  for (const target of f.installTargets) assert.equal(fs.existsSync(path.join(target.directory, 'ae-dataops')), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(ledger, 'utf8')).last_applied.businesses, { dataops: false });
});

test('identity switches reuse the applied policy while package changes require revalidation', t => {
  const f = fixture(t);
  assert.equal(f.run({ businesses: { dataops: false } }).status, 'success');
  let scans = 0;
  const tool: SkillsTool = { targets() { scans++; return f.tool.targets(); }, apply: (...args) => f.tool.apply(...args) };
  const tokenFingerprint = createHash('sha256').update('another account').digest('hex');
  assert.equal(f.run({ businesses: { dataops: false }, onlyIfChanged: true, tokenFingerprint, tool }).status, 'success');
  assert.equal(scans, 0);
  assert.equal(f.run({ businesses: { dataops: false }, onlyIfChanged: true, tokenFingerprint, packageVersion: '6.0.57', tool }).status, 'success');
  assert.equal(scans, 1);
});

function recordResourceReads(t: TestContext): string[] {
  const reads: string[] = [];
  const original = fs.readFileSync;
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    if (typeof file === 'string' && file.includes(`${path.sep}references${path.sep}`)) reads.push(file);
    return original(file, ...args);
  });
  return reads;
}

test('switching host and token with the same complete policy avoids worker and resource scans', t => {
  const f = fixture(t);
  const businesses = { dataops: true, engage: false, agent: false, community: false };
  assert.equal(f.run({ businesses }).status, 'success');
  const resources = recordResourceReads(t);
  const unused: SkillsTool = {
    targets() { assert.fail('An identical installed policy must not rediscover clients after an identity switch'); },
    apply() { assert.fail('An identical installed policy must not run a worker after an identity switch'); },
  };
  const tokenFingerprint = createHash('sha256').update('next fixture account').digest('hex');
  const host = 'https://second.example.test';
  const result = f.run({ businesses, host, tokenFingerprint, onlyIfChanged: true, tool: unused });
  assert.equal(result.status, 'success', JSON.stringify(result));
  assert.deepEqual(resources, []);
  const applied = JSON.parse(fs.readFileSync(path.join(f.options.stateDirectory!, 'business-skills.json'), 'utf8')).last_applied;
  assert.equal(applied.host, host);
  assert.equal(applied.token_fingerprint, tokenFingerprint);
  assert.deepEqual(applied.businesses, businesses);
});

test('changing only DataOps reads only its source and managed resource files', t => {
  const f = fixture(t);
  const closed = { dataops: false, engage: false, agent: false, community: false };
  assert.equal(f.run({ businesses: closed }).status, 'success');
  const resources = recordResourceReads(t);
  const opened = f.run({ businesses: { ...closed, dataops: true }, onlyIfChanged: true });
  assert.equal(opened.status, 'success', JSON.stringify(opened));
  assert.equal(opened.installed.length, f.installTargets.length);
  assert.ok(resources.length > 0);
  assert.ok(resources.every(file => file.includes(`${path.sep}ae-dataops${path.sep}`)), JSON.stringify(resources));
  resources.length = 0;
  const removed = f.run({ businesses: closed, onlyIfChanged: true });
  assert.equal(removed.status, 'success', JSON.stringify(removed));
  assert.equal(removed.removed.length, f.installTargets.length);
  assert.ok(resources.length > 0);
  assert.ok(resources.every(file => file.includes(`${path.sep}ae-dataops${path.sep}`)), JSON.stringify(resources));
});

test('an unknown transition retains installed copies without reading resources or discovering clients', t => {
  const f = fixture(t);
  assert.equal(f.run({ businesses: { dataops: true, engage: false, agent: false, community: false } }).status, 'success');
  const resources = recordResourceReads(t);
  const unused: SkillsTool = {
    targets() { assert.fail('An unknown state must not rediscover copies to change them'); },
    apply() { assert.fail('An unknown state must not install or remove copies'); },
  };
  const unknown = f.run({ businesses: { engage: false, agent: false, community: false }, onlyIfChanged: true, tool: unused });
  assert.equal(unknown.status, 'success', JSON.stringify(unknown));
  assert.deepEqual(resources, []);
  for (const target of f.installTargets) assert.equal(fs.existsSync(path.join(target.directory, 'ae-dataops')), true);
  const ledger = JSON.parse(fs.readFileSync(path.join(f.options.stateDirectory!, 'business-skills.json'), 'utf8'));
  assert.equal(ledger.last_applied.businesses.dataops, undefined);
});

test('a delta removes edited CLI-owned DataOps copies while leaving unrelated resources unread', t => {
  const f = fixture(t);
  const opened = { dataops: true, engage: false, agent: false, community: false };
  assert.equal(f.run({ businesses: opened }).status, 'success');
  const personal = path.join(f.installTargets[0].directory, 'ae-dataops', 'references', 'usage.md');
  fs.writeFileSync(personal, 'Personal guidance');
  const resources = recordResourceReads(t);
  const removed = f.run({ businesses: { ...opened, dataops: false }, onlyIfChanged: true });
  assert.equal(removed.status, 'success', JSON.stringify(removed));
  assert.equal(removed.removed.length, f.installTargets.length);
  assert.ok(resources.every(file => file.includes(`${path.sep}ae-dataops${path.sep}`)), JSON.stringify(resources));
  assert.equal(fs.existsSync(personal), false);
});

for (const change of ['legacy-marker', 'mapping-policy'] as const) {
  test(`${change} requires full verification before a policy can be reused`, t => {
    const f = fixture(t);
    const businesses = { dataops: false, engage: false, agent: false, community: false };
    assert.equal(f.run({ businesses }).status, 'success');
    const file = path.join(f.options.stateDirectory!, 'business-skills.json');
    const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (change === 'legacy-marker') {
      delete ledger.last_applied.source_root;
      delete ledger.last_applied.policy_hash;
    } else ledger.last_applied.policy_hash = '0'.repeat(64);
    fs.writeFileSync(file, JSON.stringify(ledger));
    const resources = recordResourceReads(t);
    let scans = 0;
    const tool: SkillsTool = { targets() { scans++; return f.tool.targets(); }, apply: (...args) => f.tool.apply(...args) };
    assert.equal(f.run({ businesses, onlyIfChanged: true, tool }).status, 'success');
    assert.equal(scans, 1);
    assert.ok(resources.some(resource => resource.includes(`${path.sep}ae-analysis${path.sep}`)));
    const applied = JSON.parse(fs.readFileSync(file, 'utf8')).last_applied;
    assert.equal(applied.source_root, fs.realpathSync(f.source));
    assert.match(applied.policy_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(applied.policy_hash, '0'.repeat(64));
  });
}

test('a different package source requires full verification even at the same version and business policy', t => {
  const f = fixture(t);
  const businesses = { dataops: false, engage: false, agent: false, community: false };
  assert.equal(f.run({ businesses }).status, 'success');
  const replacement = path.join(f.root, 'replacement-package', 'skills');
  fs.cpSync(f.source, replacement, { recursive: true });
  fs.writeFileSync(path.join(replacement, 'ae-analysis', 'references', 'usage.md'), 'Replacement source guidance');
  const resources = recordResourceReads(t);
  const result = f.run({ businesses, skillsDirectory: replacement, onlyIfChanged: true });
  assert.equal(result.status, 'success', JSON.stringify(result));
  assert.equal(result.installed.filter(copy => copy.skill === 'ae-analysis').length, f.installTargets.length);
  assert.ok(resources.some(file => file.includes(`${path.sep}ae-analysis${path.sep}`)));
  for (const target of f.installTargets) assert.equal(fs.readFileSync(path.join(target.directory, 'ae-analysis', 'references', 'usage.md'), 'utf8'), 'Replacement source guidance');
});

test('a failed delta clears its reusable policy and the next attempt verifies every business', t => {
  const f = fixture(t);
  const closed = { dataops: false, engage: false, agent: false, community: false };
  assert.equal(f.run({ businesses: closed }).status, 'success');
  const failed: SkillsTool = { targets: () => f.tool.targets(), apply() { throw new Error('Fixture failure before receipts'); } };
  assert.equal(f.run({ businesses: { ...closed, dataops: true }, onlyIfChanged: true, tool: failed }).status, 'failed');
  const resources = recordResourceReads(t);
  assert.equal(f.run({ businesses: closed, onlyIfChanged: true }).status, 'success');
  assert.ok(resources.some(file => file.includes(`${path.sep}ae-analysis${path.sep}`)));
});

test('a superseded generation cannot update identity metadata through the identical-policy fast path', t => {
  const f = fixture(t);
  const businesses = { dataops: false };
  assert.equal(f.run({ businesses }).status, 'success');
  const generation = reserveBusinessSkillContext(f.options);
  reserveBusinessSkillContext({ ...f.options, host: 'https://newest.example.test' });
  const ledger = path.join(f.options.stateDirectory!, 'business-skills.json');
  const before = fs.readFileSync(ledger, 'utf8');
  const resources = recordResourceReads(t);
  const result = f.run({ businesses, generation, onlyIfChanged: true });
  assert.equal(result.status, 'stale');
  assert.equal(fs.readFileSync(ledger, 'utf8'), before);
  assert.deepEqual(resources, []);
});

test('selective bundle reads use actual header names and do not deep-read unselected references', t => {
  const f = fixture(t);
  fs.renameSync(path.join(f.source, 'ae-dataops'), path.join(f.source, 'warehouse-guidance'));
  const resources = recordResourceReads(t);
  const selected = readBundledSkills(f.source, name => name === 'ae-dataops');
  assert.deepEqual(selected.map(skill => skill.name), ['ae-dataops']);
  assert.equal(selected[0].files.get(path.join('references', 'usage.md'))!.toString(), 'Complete source for ae-dataops\n');
  assert.ok(resources.length > 0);
  assert.ok(resources.every(file => file.includes(`${path.sep}warehouse-guidance${path.sep}`)), JSON.stringify(resources));
});

for (const invalid of ['duplicate-header', 'invalid-header'] as const) {
  test(`selective bundle reads still reject an unselected ${invalid}`, t => {
    const f = fixture(t);
    if (invalid === 'duplicate-header') fs.cpSync(path.join(f.source, 'ae-analysis'), path.join(f.source, 'another-analysis'), { recursive: true });
    else fs.writeFileSync(path.join(f.source, 'ae-analysis', 'SKILL.md'), '---\nname: [invalid]\ndescription: Invalid fixture\n---\n');
    assert.throws(() => readBundledSkills(f.source, name => name === 'ae-dataops'), /Invalid bundled Skill|duplicate/);
  });
}

test('explicit synchronization repairs missing copies even with an unchanged applied state', t => {
  const f = fixture(t);
  assert.equal(f.run({ businesses: { dataops: true } }).status, 'success');
  const missing = path.join(f.installTargets[0].directory, 'ae-dataops');
  fs.rmSync(missing, { recursive: true });
  assert.equal(f.run({ businesses: { dataops: true } }).status, 'success');
  assert.equal(skillCopyHash(missing), skillCopyHash(path.join(f.source, 'ae-dataops'), true));
});

test('large synchronization requests drain the complete UTF-8 pipe before parsing', t => {
  const f = fixture(t);
  const source = path.join(f.root, 'package', 'skills-\u4e1a\u52a1\u76ee\u5f55');
  fs.renameSync(f.source, source);
  const batchCount = 192;
  for (let index = 0; index < batchCount; index++) {
    const name = `ae-batch-${index}`;
    const directory = path.join(source, name);
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'SKILL.md'), `---\nname: ${name}\ndescription: Batch transport fixture\n---\n`);
  }
  let inputBytes = 0;
  const tool: SkillsTool = {
    targets: () => f.tool.targets(),
    apply: (operations, guard) => {
      inputBytes = Buffer.byteLength(JSON.stringify({ action: 'apply', operations, guard }));
      return f.tool.apply(operations, guard);
    },
  };
  const report = f.run({ tool, skillsDirectory: source,
    businesses: { dataops: false, engage: false, agent: false, community: false } });
  assert.ok(inputBytes > 128 * 1024, `Expected a request above the pipe buffer, got ${inputBytes} bytes`);
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.installed.length, (batchCount + 1) * 2);
  for (const target of f.installTargets) assert.ok(fs.existsSync(path.join(target.directory, `ae-batch-${batchCount - 1}`, 'SKILL.md')));
});

test('unknown neither deletes existing optional copies nor installs missing optional copies', t => {
  const f = fixture(t);
  f.installFixture();
  f.run({ mode: 'adopt' });
  fs.rmSync(path.join(f.targets[1].directory, 'ae-dataops'), { recursive: true });
  const report = f.run();
  assert.equal(report.removed.length, 0);
  assert.ok(!report.installed.some(copy => copy.skill === 'ae-dataops'));
  assert.equal(fs.existsSync(path.join(f.targets[1].directory, 'ae-dataops')), false);
  assert.equal(fs.existsSync(path.join(f.targets[0].directory, 'ae-dataops')), true);
});

test('unknown preserves edits and installer links to a CLI-owned canonical copy', t => {
  const f = fixture(t);
  f.copy('ae-dataops', f.targets[0]);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const canonical = path.join(f.targets[0].directory, 'ae-dataops');
  fs.writeFileSync(path.join(canonical, 'personal.md'), 'Personal instructions');
  const linked = path.join(f.targets.find(target => target.agent === 'claude-code')!.directory, 'ae-dataops');
  fs.mkdirSync(path.dirname(linked), { recursive: true });
  fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const report = f.run({ businesses: {} });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.length, 0);
  assert.equal(fs.readFileSync(path.join(canonical, 'personal.md'), 'utf8'), 'Personal instructions');
  assert.ok(fs.lstatSync(linked).isSymbolicLink());
});

test('a retired owned Skill without an optional-business mapping is not removed', t => {
  const f = fixture(t);
  const name = 'ae-personal-guidance';
  const source = path.join(f.source, name);
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'SKILL.md'), `---\nname: ${name}\ndescription: Unmapped fixture\n---\nPersonal instructions\n`);
  f.copy(name, f.targets[0]);
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  fs.rmSync(source, { recursive: true });
  const report = f.run({ businesses: { dataops: false, agent: false, engage: false, community: false } });
  assert.equal(report.removed.filter(copy => copy.skill === name).length, 0);
  assert.ok(fs.existsSync(path.join(f.targets[0].directory, name, 'SKILL.md')));
});

test('a matching but unowned copy is preserved until an installation explicitly adopts it', t => {
  const f = fixture(t);
  f.installFixture();
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'partial');
  assert.equal(report.removed.length, 0);
  assert.equal(report.skipped.filter(copy => copy.skill === 'ae-dataops').length, 4);
  assert.ok(report.skipped.every(copy => copy.reason === 'copy_not_managed'));
});

test('an existing unowned Skill is not overwritten when its business is enabled', t => {
  const f = fixture(t);
  const target = f.targets[0];
  f.copy('ae-dataops', target);
  fs.writeFileSync(path.join(target.directory, 'ae-dataops', 'SKILL.md'), 'Personal replacement');
  const report = f.run({ businesses: { dataops: true } });
  assert.equal(report.status, 'partial');
  assert.equal(fs.readFileSync(path.join(target.directory, 'ae-dataops', 'SKILL.md'), 'utf8'), 'Personal replacement');
});

test('package updates replace only copies still matching the previously recorded version', t => {
  const f = fixture(t);
  f.installFixture();
  f.run({ mode: 'adopt' });
  fs.writeFileSync(path.join(f.source, 'ae-dataops', 'references', 'usage.md'), 'New package reference\n');
  fs.writeFileSync(path.join(f.targets[2].directory, 'ae-dataops', 'references', 'usage.md'), 'Personal reference\n');
  const report = f.run({ businesses: { dataops: true }, packageVersion: '6.0.57' });
  assert.equal(report.installed.filter(copy => copy.skill === 'ae-dataops').length, 3);
  assert.equal(report.skipped.filter(copy => copy.skill === 'ae-dataops').length, 1);
  assert.equal(fs.readFileSync(path.join(f.targets[2].directory, 'ae-dataops', 'references', 'usage.md'), 'utf8'), 'Personal reference\n');
  for (const target of f.targets.filter(target => !target.installable)) {
    assert.equal(fs.readFileSync(path.join(target.directory, 'ae-dataops', 'references', 'usage.md'), 'utf8'), 'New package reference\n');
  }
});

test('extra empty directories and Finder metadata do not exempt CLI-owned copies from removal', t => {
  const f = fixture(t);
  f.installFixture();
  f.run({ mode: 'adopt' });
  fs.mkdirSync(path.join(f.targets[1].directory, 'ae-dataops', 'notes'));
  fs.writeFileSync(path.join(f.targets[2].directory, 'ae-dataops', '.DS_Store'), 'Finder metadata');
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 4);
  assert.equal(fs.existsSync(path.join(f.targets[1].directory, 'ae-dataops')), false);
  assert.ok(report.removed.some(copy => copy.path === path.join(f.targets[2].directory, 'ae-dataops')));
});

test('verified legacy links and their managed canonical copy are removed together', t => {
  const f = fixture(t);
  const name = 'ae-page-context';
  fs.cpSync(path.join(f.source, 'ae-agent'), path.join(f.source, name), { recursive: true });
  fs.writeFileSync(path.join(f.source, name, 'SKILL.md'), `---\nname: ${name}\ndescription: Page context fixture\n---\n`);
  f.copy(name, f.targets[0]);
  f.run({ mode: 'adopt' });
  for (const client of ['.codebuddy', '.kiro', '.trae']) fs.mkdirSync(path.join(f.home, client));
  const targets = f.tool.targets().filter(target => ['claude-code', 'codebuddy', 'kiro-cli', 'trae'].includes(target.agent));
  assert.equal(targets.length, 4);
  const canonical = path.join(f.targets[0].directory, name);
  const links = targets.map(target => path.join(target.directory, name));
  for (const linked of links) {
    fs.mkdirSync(path.dirname(linked), { recursive: true });
    fs.symlinkSync(process.platform === 'win32' ? canonical : path.relative(path.dirname(linked), canonical), linked,
      process.platform === 'win32' ? 'junction' : 'dir');
  }
  const report = f.run({ businesses: { agent: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === name).length, 5);
  assert.equal(report.removed.filter(copy => copy.reason === 'legacy_link_removed').length, 4);
  for (const file of [...links, canonical]) assert.throws(() => fs.lstatSync(file), { code: 'ENOENT' });
});

test('enabled legacy links become managed tool copies and unknown links remain unchanged', t => {
  const f = fixture(t);
  f.copy('ae-dataops', f.targets[0]);
  f.run({ mode: 'adopt' });
  const canonical = path.join(f.targets[0].directory, 'ae-dataops');
  const target = f.targets.find(target => target.agent === 'claude-code')!;
  const linked = path.join(target.directory, 'ae-dataops');
  fs.mkdirSync(target.directory, { recursive: true });
  fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const unknown = f.run();
  assert.equal(unknown.status, 'success', JSON.stringify(unknown));
  assert.equal(fs.lstatSync(linked).isSymbolicLink(), true);
  const enabled = f.run({ businesses: { dataops: true } });
  assert.equal(enabled.status, 'success', JSON.stringify(enabled));
  assert.ok(enabled.installed.some(copy => copy.path === linked && copy.reason === 'legacy_link_materialized'));
  assert.equal(fs.lstatSync(linked).isDirectory(), true);
  const ledger = JSON.parse(fs.readFileSync(path.join(f.options.stateDirectory!, 'business-skills.json'), 'utf8'));
  assert.equal(ledger.copies[linked].hash, skillCopyHash(canonical));
  assert.equal(f.run({ businesses: { dataops: false } }).status, 'success');
  assert.equal(fs.existsSync(linked), false);
  assert.equal(f.run({ businesses: { dataops: true } }).status, 'success');
  assert.equal(skillCopyHash(linked), skillCopyHash(path.join(f.source, 'ae-dataops'), true));
});

test('an unowned canonical copy does not grant ownership of its legacy links', t => {
  const f = fixture(t);
  f.copy('ae-dataops', f.targets[0]);
  const canonical = path.join(f.targets[0].directory, 'ae-dataops');
  const linked = path.join(f.targets[1].directory, 'ae-dataops');
  fs.mkdirSync(path.dirname(linked), { recursive: true });
  fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'partial');
  assert.equal(report.removed.length, 0);
  assert.ok(fs.lstatSync(linked).isSymbolicLink());
  assert.ok(fs.existsSync(canonical));
});

test('edited canonical contents and a changed package do not exempt owned installer links from removal', t => {
  for (const change of ['canonical', 'package']) {
    const f = fixture(t);
    f.copy('ae-dataops', f.targets[0]);
    f.run({ mode: 'adopt' });
    const canonical = path.join(f.targets[0].directory, 'ae-dataops');
    const linked = path.join(f.targets[1].directory, 'ae-dataops');
    fs.mkdirSync(path.dirname(linked), { recursive: true });
    fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
    const changed = change === 'canonical' ? canonical : path.join(f.source, 'ae-dataops');
    fs.writeFileSync(path.join(changed, 'references', 'usage.md'), 'Changed independently\n');
    const report = f.run({ businesses: { dataops: false } });
    assert.equal(report.status, 'success', JSON.stringify(report));
    assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 2);
    for (const file of [linked, canonical]) assert.throws(() => fs.lstatSync(file), { code: 'ENOENT' });
  }
});

test('custom destinations and chained aliases are preserved without exempting the owned canonical copy', t => {
  const f = fixture(t);
  f.copy('ae-dataops', f.targets[0]);
  f.run({ mode: 'adopt' });
  const canonical = path.join(f.targets[0].directory, 'ae-dataops');
  const external = path.join(f.root, 'user-skills', 'ae-dataops');
  fs.mkdirSync(path.dirname(external), { recursive: true });
  fs.cpSync(path.join(f.source, 'ae-dataops'), external, { recursive: true });
  const through = path.join(f.root, 'custom-alias');
  fs.symlinkSync(canonical, through, process.platform === 'win32' ? 'junction' : 'dir');
  const destinations = [external, through];
  const links = f.targets.slice(1, 3).map((target, index) => {
    fs.mkdirSync(target.directory, { recursive: true });
    const file = path.join(target.directory, 'ae-dataops');
    fs.symlinkSync(destinations[index], file, process.platform === 'win32' ? 'junction' : 'dir');
    return file;
  });
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'partial', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.path === canonical).length, 1);
  assert.equal(fs.existsSync(canonical), false);
  for (const linked of links) assert.ok(fs.lstatSync(linked).isSymbolicLink());
  assert.equal(skillCopyHash(external), skillCopyHash(path.join(f.source, 'ae-dataops'), true));
});

test('a custom alias in a registry discovery directory remains while owned paths are removed', t => {
  const f = fixture(t);
  f.copy('ae-dataops', f.targets[0]);
  f.run({ mode: 'adopt' });
  const canonical = path.join(f.targets[0].directory, 'ae-dataops');
  const target = f.targets.find(target => target.agent === 'claude-code')!;
  fs.mkdirSync(target.directory, { recursive: true });
  const alias = path.join(target.directory, 'personal-alias');
  const linked = path.join(target.directory, 'ae-dataops');
  for (const file of [alias, linked]) fs.symlinkSync(canonical, file, process.platform === 'win32' ? 'junction' : 'dir');
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.ok(report.removed.some(copy => copy.path === linked));
  assert.ok(report.removed.some(copy => copy.path === canonical));
  assert.ok(fs.lstatSync(alias).isSymbolicLink());
  assert.equal(fs.existsSync(alias), false);
  assert.equal(fs.existsSync(canonical), false);
});

test('custom aliases survive removal and later restoration of the CLI-owned paths they reference', t => {
  const f = fixture(t);
  f.copy('ae-dataops', f.targets[0]);
  f.run({ mode: 'adopt' });
  const canonical = path.join(f.targets[0].directory, 'ae-dataops');
  const target = f.targets.find(target => target.agent === 'claude-code')!;
  fs.mkdirSync(target.directory, { recursive: true });
  const linked = path.join(target.directory, 'ae-dataops');
  const alias = path.join(target.directory, 'personal-alias');
  const referencesAlias = path.join(target.directory, 'personal-reference-alias');
  const indirect = path.join(f.root, 'intermediate-link');
  const chainedAlias = path.join(target.directory, 'personal-chained-alias');
  fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
  fs.symlinkSync(linked, alias, process.platform === 'win32' ? 'junction' : 'dir');
  fs.symlinkSync(path.join(linked, 'references'), referencesAlias, process.platform === 'win32' ? 'junction' : 'dir');
  fs.symlinkSync(linked, indirect, process.platform === 'win32' ? 'junction' : 'dir');
  fs.symlinkSync(indirect, chainedAlias, process.platform === 'win32' ? 'junction' : 'dir');
  const removed = f.run({ businesses: { dataops: false } });
  assert.equal(removed.status, 'success', JSON.stringify(removed));
  assert.equal(removed.removed.filter(copy => copy.skill === 'ae-dataops').length, 2);
  for (const file of [alias, referencesAlias, chainedAlias]) {
    assert.ok(fs.lstatSync(file).isSymbolicLink());
    assert.equal(fs.existsSync(file), false);
  }
  assert.equal(fs.existsSync(canonical), false);
  assert.throws(() => fs.lstatSync(linked), { code: 'ENOENT' });
  const enabled = f.run({ businesses: { dataops: true } });
  assert.equal(enabled.status, 'success', JSON.stringify(enabled));
  assert.ok(fs.lstatSync(linked).isDirectory());
  assert.ok(fs.lstatSync(alias).isSymbolicLink());
  assert.equal(fs.realpathSync(alias), linked);
  assert.equal(skillCopyHash(fs.realpathSync(alias)), skillCopyHash(path.join(f.source, 'ae-dataops'), true));
  assert.ok(fs.existsSync(path.join(chainedAlias, 'SKILL.md')));
  assert.equal(fs.readFileSync(path.join(referencesAlias, 'usage.md'), 'utf8'), 'Complete source for ae-dataops\n');
});

test('parent traversal aliases remain untouched when referenced CLI-owned paths are removed', { skip: process.platform === 'win32' }, t => {
  for (const throughLegacy of [false, true]) {
    const f = fixture(t);
    f.copy('ae-dataops', f.targets[0]);
    f.run({ mode: 'adopt' });
    const canonical = path.join(f.targets[0].directory, 'ae-dataops');
    const target = f.targets.find(target => target.agent === 'claude-code')!;
    fs.mkdirSync(target.directory, { recursive: true });
    const linked = path.join(target.directory, 'ae-dataops');
    fs.symlinkSync(canonical, linked, 'dir');
    const outside = path.join(f.root, 'outside');
    fs.mkdirSync(outside);
    fs.symlinkSync(path.join(throughLegacy ? linked : canonical, 'references'), path.join(outside, 'bridge'), 'dir');
    const alias = path.join(target.directory, 'personal-parent-alias');
    fs.symlinkSync(`${outside}/bridge/../SKILL.md`, alias);
    assert.equal(fs.readFileSync(alias, 'utf8'), fs.readFileSync(path.join(canonical, 'SKILL.md'), 'utf8'));
    const report = f.run({ businesses: { dataops: false } });
    assert.equal(report.status, 'success', JSON.stringify(report));
    assert.equal(fs.existsSync(canonical), false);
    assert.throws(() => fs.lstatSync(linked), { code: 'ENOENT' });
    assert.ok(fs.lstatSync(alias).isSymbolicLink());
    assert.equal(fs.existsSync(alias), false);
  }
});

test('the worker rechecks legacy link destinations, ownership and context', t => {
  for (const change of ['link', 'ledger', 'context']) {
    const f = fixture(t);
    f.copy('ae-dataops', f.targets[0]);
    f.run({ mode: 'adopt' });
    const canonical = path.join(f.targets[0].directory, 'ae-dataops');
    const target = f.targets.find(target => target.agent === 'claude-code')!;
    fs.mkdirSync(target.directory, { recursive: true });
    const linked = path.join(target.directory, 'ae-dataops');
    fs.symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir');
    const tool: SkillsTool = {
      targets: () => f.tool.targets(),
      apply: (operations, guard) => {
        if (change === 'link') {
          const indirect = path.join(f.root, 'changed-alias');
          fs.symlinkSync(canonical, indirect, process.platform === 'win32' ? 'junction' : 'dir');
          fs.unlinkSync(linked);
          fs.symlinkSync(indirect, linked, process.platform === 'win32' ? 'junction' : 'dir');
        } else if (change === 'context') reserveBusinessSkillContext({ ...f.options, host: 'https://changed.example.test' });
        else fs.writeFileSync(path.join(f.options.stateDirectory!, 'business-skills.json'), JSON.stringify({ schema_version: 1, copies: {} }));
        return f.tool.apply(operations, guard);
      },
    };
    const report = f.run({ tool, businesses: { dataops: false } });
    assert.equal(report.status, change === 'context' ? 'stale' : 'partial', JSON.stringify(report));
    assert.ok(report.skipped.some(copy => copy.path === linked));
    assert.equal(report.removed.length, change === 'link' ? 1 : 0, change);
    assert.ok(fs.lstatSync(linked).isSymbolicLink());
    assert.equal(fs.existsSync(canonical), change !== 'link', change);
  }
});

test('a linked global directory cannot grant ownership of the package source tree', t => {
  const f = fixture(t);
  const canonical = f.targets[0];
  fs.mkdirSync(path.dirname(canonical.directory), { recursive: true });
  fs.symlinkSync(f.source, canonical.directory, process.platform === 'win32' ? 'junction' : 'dir');
  const adopted = f.run({ mode: 'adopt' });
  assert.equal(adopted.status, 'partial');
  assert.equal(adopted.managed_count, 0);
  assert.ok(adopted.skipped.some(copy => copy.reason === 'package_source_overlap'));
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.removed.length, 0);
  assert.ok(fs.existsSync(path.join(f.source, 'ae-dataops', 'SKILL.md')));
});

test('package-source ancestors, descendants and missing children cannot be mutation targets', t => {
  const f = fixture(t);
  assert.equal(skillPathProblem(f.source, 'ae-dataops', f.source), 'package_source_overlap');
  assert.equal(skillPathProblem(f.source, 'missing-skill', f.source), 'package_source_overlap');
  assert.equal(skillPathProblem(f.root, 'package', f.source), 'package_source_overlap');
});

test('parent-directory links preserve independent user copies and real aliases are deduplicated', t => {
  const f = fixture(t);
  const userDirectory = path.join(f.root, 'user-skills');
  fs.mkdirSync(userDirectory);
  const linked = f.targets.find(target => target.agent === 'claude-code')!;
  fs.symlinkSync(userDirectory, linked.directory, process.platform === 'win32' ? 'junction' : 'dir');
  fs.cpSync(path.join(f.source, 'ae-dataops'), path.join(userDirectory, 'ae-dataops'), { recursive: true });
  const report = f.run({ mode: 'adopt' });
  assert.ok(report.skipped.some(copy => copy.reason === 'copy_parent_linked'));
  assert.equal(report.managed_count, 0);
  assert.ok(fs.existsSync(path.join(userDirectory, 'ae-dataops', 'SKILL.md')));
  const codex = f.targets.find(target => target.agent === 'codex')!;
  fs.symlinkSync(userDirectory, codex.directory, process.platform === 'win32' ? 'junction' : 'dir');
  const aliases = f.tool.targets().filter(target => fs.existsSync(target.directory)
    && fs.realpathSync(target.directory) === userDirectory);
  assert.equal(aliases.length, 1);
});

test('the worker rechecks package overlap after a target parent changes during planning', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const canonical = f.targets[0];
  const tool: SkillsTool = {
    targets: () => f.tool.targets(),
    apply: (operations, guard) => {
      fs.rmSync(canonical.directory, { recursive: true });
      fs.symlinkSync(f.source, canonical.directory, process.platform === 'win32' ? 'junction' : 'dir');
      return f.tool.apply(operations, guard);
    },
  };
  const report = f.run({ tool, businesses: { dataops: false } });
  assert.equal(report.status, 'partial');
  assert.ok(report.skipped.some(copy => copy.reason === 'package_source_overlap'));
  assert.ok(fs.existsSync(path.join(f.source, 'ae-dataops', 'SKILL.md')));
});

test('the worker rejects an installation source changed after planning', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  fs.writeFileSync(path.join(f.source, 'ae-dataops', 'references', 'usage.md'), 'New package before planning');
  const tool: SkillsTool = {
    targets: () => f.tool.targets(),
    apply: (operations, guard) => {
      fs.writeFileSync(path.join(f.source, 'ae-dataops', 'references', 'usage.md'), 'Changed package');
      return f.tool.apply(operations, guard);
    },
  };
  const report = f.run({ tool, businesses: { dataops: true }, packageVersion: '6.0.57' });
  assert.equal(report.status, 'partial');
  assert.equal(report.removed.length, 0);
  assert.equal(report.installed.filter(copy => copy.skill === 'ae-dataops').length, 0);
  assert.ok(report.skipped.some(copy => copy.reason === 'package_changed'));
  for (const target of f.targets) assert.ok(fs.existsSync(path.join(target.directory, 'ae-dataops')));
});

test('a newer host or token reservation invalidates the previous refresh before mutation', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const generation = reserveBusinessSkillContext(f.options);
  reserveBusinessSkillContext({ ...f.options, host: 'https://two.example.test',
    tokenFingerprint: createHash('sha256').update('second account').digest('hex') });
  const report = f.run({ generation, businesses: { dataops: false } });
  assert.equal(report.status, 'stale');
  assert.equal(report.removed.length, 0);
  for (const target of f.targets) assert.ok(fs.existsSync(path.join(target.directory, 'ae-dataops')));
});

test('the worker checks the generation again after the plan was prepared', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const tool: SkillsTool = {
    targets: () => f.tool.targets(),
    apply: (operations, guard) => {
      reserveBusinessSkillContext({ ...f.options, host: 'https://new.example.test' });
      return f.tool.apply(operations, guard);
    },
  };
  const report = f.run({ tool, businesses: { dataops: false } });
  assert.equal(report.status, 'stale');
  assert.equal(report.removed.length, 0);
  assert.ok(report.skipped.some(copy => copy.reason === 'context_changed'));
});

test('an active lock returns busy and never touches the installed copies', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  fs.writeFileSync(path.join(f.options.stateDirectory!, 'business-skills.lock'), JSON.stringify({ pid: process.pid, owner: 'test' }));
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'busy');
  assert.equal(report.removed.length, 0);
  assert.ok(fs.existsSync(path.join(f.targets[0].directory, 'ae-dataops')));
});

test('a lock left by a terminated process can be reclaimed', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  fs.writeFileSync(path.join(f.options.stateDirectory!, 'business-skills.lock'), JSON.stringify({ pid: 2147483647, owner: 'terminated' }));
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 4);
  assert.equal(fs.existsSync(path.join(f.options.stateDirectory!, 'business-skills.lock')), false);
});

test('empty or truncated legacy locks and orphan reclamation files can be recovered', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const lock = path.join(f.options.stateDirectory!, 'business-skills.lock');
  for (const content of ['', '{"pid":', JSON.stringify({ pid: 2147483647, owner: 'dead' })]) {
    fs.writeFileSync(lock, content);
    fs.writeFileSync(`${lock}.reclaim`, '');
    const report = f.run();
    assert.equal(report.status, 'success', JSON.stringify(report));
    assert.equal(fs.existsSync(lock), false);
    assert.equal(fs.existsSync(`${lock}.reclaim`), false);
  }
});

test('a dead directory owner is recoverable even if its JSON was truncated', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const lock = path.join(f.options.stateDirectory!, 'business-skills.lock');
  fs.mkdirSync(lock);
  fs.writeFileSync(path.join(lock, 'owner-2147483647-00000000-0000-0000-0000-000000000000.json'), '{');
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 4);
});

test('concurrent stale-lock reclaimers cannot enter the protected section together', async t => {
  const f = fixture(t);
  fs.mkdirSync(f.options.stateDirectory!, { recursive: true });
  const lock = path.join(f.options.stateDirectory!, 'business-skills.lock');
  fs.mkdirSync(lock);
  fs.writeFileSync(path.join(lock, 'owner-2147483647-00000000-0000-0000-0000-000000000000.json'), '{}');
  const events = path.join(f.root, 'lock-events');
  const generation = reserveBusinessSkillContext(f.options);
  const moduleUrl = new URL('../src/core/business-skill-sync.ts', import.meta.url).href;
  const script = `import fs from 'node:fs'; import { syncBusinessSkills } from ${JSON.stringify(moduleUrl)};
    const { options, events } = JSON.parse(process.argv[1]);
    const tool = { targets() {
      fs.appendFileSync(events, 'start ' + process.pid + '\\n');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
      fs.appendFileSync(events, 'end ' + process.pid + '\\n');
      return [];
    }, apply() { return []; } };
    console.log(syncBusinessSkills({ ...options, tool }).status);`;
  const input = JSON.stringify({ options: { ...f.options, tool: undefined, generation }, events });
  const statuses = await Promise.all(Array.from({ length: 4 }, () => new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script, input], {
      cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '', error = '';
    child.stdout.on('data', value => { output += value; });
    child.stderr.on('data', value => { error += value; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
  })));
  assert.ok(statuses.includes('success'), statuses.join(','));
  assert.ok(statuses.every(status => ['success', 'busy'].includes(status)), statuses.join(','));
  const lines = fs.readFileSync(events, 'utf8').trim().split('\n');
  for (let index = 0; index < lines.length; index += 2) {
    assert.match(lines[index], /^start \d+$/);
    assert.equal(lines[index + 1], lines[index].replace('start ', 'end '));
  }
  assert.equal(fs.existsSync(lock), false);
});

test('removal never falls back to unsupported clients in the current working directory', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const projectCopies = ['.agents/skills', 'agent/skills'].map(directory => path.join(f.cwd, directory, 'ae-dataops'));
  for (const directory of projectCopies) {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'SKILL.md'), 'Local user-owned Skill');
  }
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  for (const directory of projectCopies) assert.equal(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'), 'Local user-owned Skill');
});

test('current-context checks expose generation and identity changes before cache writes', t => {
  const f = fixture(t);
  const generation = reserveBusinessSkillContext(f.options);
  assert.equal(isBusinessSkillContextCurrent({ ...f.options, generation }), true);
  assert.equal(isBusinessSkillContextCurrent({ ...f.options, generation, isCurrentContext: () => false }), false);
  assert.equal(isBusinessSkillContextCurrent({ ...f.options, generation, host: 'https://other.example.test' }), false);
  reserveBusinessSkillContext({ ...f.options, tokenFingerprint: createHash('sha256').update('new account').digest('hex') });
  assert.equal(isBusinessSkillContextCurrent({ ...f.options, generation }), false);
});

test('a per-copy installer failure is reported even when the tool does not throw', { skip: process.platform === 'win32' || process.getuid?.() === 0 }, t => {
  const f = fixture(t);
  const target = f.targets.find(target => target.agent === 'claude-code')!;
  fs.mkdirSync(target.directory, { recursive: true });
  fs.chmodSync(target.directory, 0o500);
  try {
    const report = f.run({ businesses: { dataops: true } });
    assert.equal(report.status, 'partial', JSON.stringify(report));
    assert.ok(report.failed.some(copy => copy.agent === 'claude-code' && copy.skill === 'ae-dataops'));
    assert.ok(!report.installed.some(copy => copy.agent === 'claude-code'));
  } finally { fs.chmodSync(target.directory, 0o700); }
});

test('an external content edit after planning does not revoke ownership before removal', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const protectedCopy = path.join(f.targets[0].directory, 'ae-dataops');
  const tool: SkillsTool = {
    targets: () => f.tool.targets(),
    apply: (operations, guard) => {
      fs.writeFileSync(path.join(protectedCopy, 'personal.md'), 'Edit during synchronization');
      return f.tool.apply(operations, guard);
    },
  };
  const report = f.run({ tool, businesses: { dataops: false } });
  assert.equal(report.status, 'success', JSON.stringify(report));
  assert.ok(report.removed.some(copy => copy.path === protectedCopy));
  assert.equal(fs.existsSync(protectedCopy), false);
});

test('a replacement directory at an owned path is preserved when it appears after planning', t => {
  const f = fixture(t);
  f.installFixture();
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const replaced = path.join(f.targets[0].directory, 'ae-dataops');
  const tool: SkillsTool = {
    targets: () => f.tool.targets(),
    apply(operations, guard) {
      fs.renameSync(replaced, path.join(f.root, 'original-owned-copy'));
      fs.cpSync(path.join(f.source, 'ae-dataops'), replaced, { recursive: true });
      fs.writeFileSync(path.join(replaced, 'replacement.md'), 'Independent replacement');
      return f.tool.apply(operations, guard);
    },
  };
  const report = f.run({ tool, businesses: { dataops: false } });
  assert.equal(report.status, 'partial', JSON.stringify(report));
  assert.ok(report.skipped.some(copy => copy.path === replaced));
  assert.equal(fs.readFileSync(path.join(replaced, 'replacement.md'), 'utf8'), 'Independent replacement');
});

test('invalid ledgers fail without adopting or deleting same-named installed Skills', t => {
  const f = fixture(t);
  f.installFixture();
  fs.mkdirSync(f.options.stateDirectory!, { recursive: true });
  fs.writeFileSync(path.join(f.options.stateDirectory!, 'business-skills.json'), '{invalid');
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'failed');
  assert.equal(fs.readFileSync(path.join(f.options.stateDirectory!, 'business-skills.json'), 'utf8'), '{invalid');
  assert.ok(fs.existsSync(path.join(f.targets[0].directory, 'ae-dataops')));
});

test('the adapter rejects a modified or differently versioned upstream implementation', t => {
  const f = fixture(t);
  const dist = path.join(f.root, 'wrong-tool', 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, '..', 'package.json'), JSON.stringify({ version: '1.5.12' }));
  fs.writeFileSync(path.join(dist, 'cli.mjs'), 'process.exit(0);');
  assert.throws(() => createPinnedSkillsTool({ entry: path.join(dist, 'cli.mjs') }), /verified skills@1\.5\.12/);
});

test('native Windows without HOME resolves targets from USERPROFILE', { skip: process.platform !== 'win32' }, t => {
  const f = fixture(t);
  const tool = createPinnedSkillsTool({ env: { ...f.env, HOME: undefined }, cwd: f.cwd });
  assert.ok(tool.targets().every(target => target.directory.startsWith(f.home + path.sep)));
  assert.ok(!tool.targets().some(target => target.directory.startsWith(f.cwd + path.sep)));
});
