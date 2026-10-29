import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { syncBusinessSkills, reserveBusinessSkillContext, isBusinessSkillContextCurrent, type BusinessSkillSyncOptions } from '../src/core/business-skill-sync.js';
import { createPinnedSkillsTool, skillCopyHash, skillPathProblem, type SkillsTool, type SkillsToolTarget } from '../src/core/skills-tool.js';

function fixture(t: TestContext) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-business-skills-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const cwd = path.join(root, 'safe-cwd');
  const source = path.join(root, 'package', 'skills');
  fs.mkdirSync(cwd, { recursive: true });
  fs.mkdirSync(home);
  const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'),
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
    stateDirectory: path.join(root, 'state'), tool, packageVersion: '6.0.56' };
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

test('false removes safe managed copies using the tool and preserves extra user files', t => {
  const f = fixture(t);
  f.installFixture();
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const modified = path.join(f.targets.find(target => target.agent === 'codex')!.directory, 'ae-dataops');
  fs.writeFileSync(path.join(modified, 'personal.md'), 'Keep this addition');
  const report = f.run({ businesses: { dataops: false } });
  assert.equal(report.status, 'partial', JSON.stringify(report));
  assert.equal(report.removed.filter(copy => copy.skill === 'ae-dataops').length, 3);
  assert.equal(report.skipped.find(copy => copy.path === modified)?.reason, 'copy_modified');
  assert.equal(fs.readFileSync(path.join(modified, 'personal.md'), 'utf8'), 'Keep this addition');
  assert.equal(fs.existsSync(path.join(f.targets[0].directory, 'ae-dataops')), false);
  assert.ok(!fs.existsSync(path.join(f.cwd, '.promptscript')));
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

test('6.1 experiment switches all three Skills independently of the Engage business', t => {
  const f = fixture(t);
  const names = ['ae-experiment', 'ae-experiment-design', 'ae-experiment-insight'];
  for (const name of names) {
    const directory = path.join(f.source, name);
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, 'SKILL.md'), `---\nname: ${name}\ndescription: An experiment Skill\n---\n`);
    f.installFixture(name);
  }
  assert.equal(f.run({ mode: 'adopt' }).status, 'success');
  const removed = f.run({ businesses: { experiment: false, engage: true } });
  assert.equal(removed.status, 'success', JSON.stringify(removed));
  assert.equal(removed.removed.filter(copy => names.includes(copy.skill)).length, 12);
  const restored = f.run({ businesses: { experiment: true, engage: false } });
  assert.equal(restored.status, 'success', JSON.stringify(restored));
  assert.equal(restored.installed.filter(copy => names.includes(copy.skill)).length, 6);
  for (const target of f.targets) for (const name of names) {
    if (!target.installable) {
      assert.equal(fs.existsSync(path.join(target.directory, name)), false);
      continue;
    }
    assert.equal(skillCopyHash(path.join(target.directory, name)), skillCopyHash(path.join(f.source, name), true));
  }
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

test('an extra empty directory protects a managed copy while DS_Store does not', t => {
  const f = fixture(t);
  f.installFixture();
  f.run({ mode: 'adopt' });
  fs.mkdirSync(path.join(f.targets[1].directory, 'ae-dataops', 'notes'));
  fs.writeFileSync(path.join(f.targets[2].directory, 'ae-dataops', '.DS_Store'), 'Finder metadata');
  const report = f.run({ businesses: { dataops: false } });
  assert.ok(report.skipped.some(copy => copy.path === path.join(f.targets[1].directory, 'ae-dataops')));
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

test('modified canonical contents and a changed package preserve legacy links', t => {
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
    assert.equal(report.status, 'partial', JSON.stringify(report));
    assert.equal(report.removed.length, 0);
    assert.ok(fs.lstatSync(linked).isSymbolicLink());
    assert.ok(fs.existsSync(canonical));
  }
});

test('custom destinations and chained links are never migrated as installer links', t => {
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
  assert.equal(report.removed.length, 0);
  assert.ok(report.skipped.some(copy => copy.path === canonical && copy.reason === 'dependent_unmanaged_link'));
  for (const linked of links) assert.ok(fs.lstatSync(linked).isSymbolicLink());
  assert.equal(skillCopyHash(external), skillCopyHash(path.join(f.source, 'ae-dataops'), true));
});

test('a custom alias in a registry discovery directory protects the canonical Skill', t => {
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
  assert.equal(report.status, 'partial', JSON.stringify(report));
  assert.ok(report.removed.some(copy => copy.path === linked));
  assert.ok(report.skipped.some(copy => copy.path === canonical && copy.reason === 'dependent_unmanaged_link'));
  assert.ok(fs.existsSync(path.join(alias, 'SKILL.md')));
  assert.ok(fs.existsSync(canonical));
});

test('a custom alias through a legacy link protects both paths on removal and survives materialization', t => {
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
  assert.equal(removed.status, 'partial', JSON.stringify(removed));
  assert.ok(removed.skipped.some(copy => copy.path === linked && copy.reason === 'dependent_unmanaged_link'));
  assert.ok(removed.skipped.some(copy => copy.path === canonical && copy.reason === 'dependent_unmanaged_link'));
  assert.equal(removed.removed.length, 0);
  assert.ok(fs.existsSync(path.join(alias, 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(chainedAlias, 'SKILL.md')));
  assert.equal(fs.readFileSync(path.join(referencesAlias, 'usage.md'), 'utf8'), 'Complete source for ae-dataops\n');
  const enabled = f.run({ businesses: { dataops: true } });
  assert.equal(enabled.status, 'success', JSON.stringify(enabled));
  assert.ok(fs.lstatSync(linked).isDirectory());
  assert.ok(fs.lstatSync(alias).isSymbolicLink());
  assert.equal(fs.realpathSync(alias), linked);
  assert.equal(skillCopyHash(fs.realpathSync(alias)), skillCopyHash(path.join(f.source, 'ae-dataops'), true));
  assert.ok(fs.existsSync(path.join(chainedAlias, 'SKILL.md')));
  assert.equal(fs.readFileSync(path.join(referencesAlias, 'usage.md'), 'utf8'), 'Complete source for ae-dataops\n');
});

test('parent traversal after a symlink preserves POSIX aliases through canonical and legacy paths', { skip: process.platform === 'win32' }, t => {
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
    assert.equal(report.status, 'partial', JSON.stringify(report));
    assert.ok(fs.existsSync(canonical));
    if (throughLegacy) assert.ok(fs.lstatSync(linked).isSymbolicLink());
    assert.equal(fs.readFileSync(alias, 'utf8'), fs.readFileSync(path.join(f.source, 'ae-dataops', 'SKILL.md'), 'utf8'));
  }
});

test('the worker rechecks legacy link destinations, canonical hashes, ownership and context', t => {
  for (const change of ['link', 'canonical', 'ledger', 'context', 'package']) {
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
        } else if (change === 'canonical') fs.writeFileSync(path.join(canonical, 'personal.md'), 'Edit after planning');
        else if (change === 'package') fs.writeFileSync(path.join(f.source, 'ae-dataops', 'personal.md'), 'Changed package');
        else if (change === 'context') reserveBusinessSkillContext({ ...f.options, host: 'https://changed.example.test' });
        else fs.writeFileSync(path.join(f.options.stateDirectory!, 'business-skills.json'), JSON.stringify({ schema_version: 1, copies: {} }));
        return f.tool.apply(operations, guard);
      },
    };
    const report = f.run({ tool, businesses: { dataops: false } });
    assert.equal(report.status, change === 'context' ? 'stale' : 'partial', JSON.stringify(report));
    assert.ok(report.skipped.some(copy => copy.path === linked));
    assert.equal(report.removed.length, 0);
    assert.ok(fs.lstatSync(linked).isSymbolicLink());
    assert.ok(fs.existsSync(canonical));
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

test('the worker rejects a package source changed after planning', t => {
  const f = fixture(t);
  f.installFixture(); f.run({ mode: 'adopt' });
  const tool: SkillsTool = {
    targets: () => f.tool.targets(),
    apply: (operations, guard) => {
      fs.writeFileSync(path.join(f.source, 'ae-dataops', 'references', 'usage.md'), 'Changed package');
      return f.tool.apply(operations, guard);
    },
  };
  const report = f.run({ tool, businesses: { dataops: false } });
  assert.equal(report.status, 'partial');
  assert.equal(report.removed.length, 0);
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

test('an external edit between planning and removal is detected inside the tool process', t => {
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
  assert.equal(report.status, 'partial');
  assert.ok(report.skipped.some(copy => copy.path === protectedCopy && copy.reason === 'copy_changed'));
  assert.ok(fs.existsSync(path.join(protectedCopy, 'personal.md')));
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
