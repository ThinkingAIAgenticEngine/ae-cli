/** Run with node --test test/release-gate-skill-businesses.test.mjs. */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkSkillBusinesses } from '../self-check/checks/skill-businesses.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'src/core/skill-businesses.json';
const YAML_ROOT = path.dirname(createRequire(import.meta.url).resolve('yaml/package.json'));

function write(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function fixture(t, groups = { analysis: ['ae-analysis'] }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-skill-businesses-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, REGISTRY, JSON.stringify(groups));
  write(root, 'skills/ae-analysis/SKILL.md', '---\nname: ae-analysis\ndescription: "Analyze data"\n---\n');
  return root;
}

function sourceFixture(t) {
  const root = fixture(t);
  fs.rmSync(path.join(root, 'skills'), { recursive: true });
  for (const relative of ['skills', 'self-check']) {
    fs.cpSync(path.join(ROOT, relative), path.join(root, relative), { recursive: true });
  }
  for (const relative of [REGISTRY, 'package.json', 'scripts/sync-skill-collaboration.mjs',
    'docs/skill-contracts/collaboration.md']) {
    write(root, relative, fs.readFileSync(path.join(ROOT, relative), 'utf8'));
  }
  fs.cpSync(YAML_ROOT, path.join(root, 'node_modules/yaml'), { recursive: true });
  return root;
}

test('a newly distributed Skill must have an explicit component mapping', (t) => {
  const root = fixture(t);
  write(root, 'skills/ae-new-skill/SKILL.md', '---\nname: ae-new-skill\ndescription: "New workflow"\n---\n');
  const result = checkSkillBusinesses(root);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.level === 'P1' && finding.msg.includes('ae-new-skill')));
});

test('a Skill with a different prefix also requires a component mapping', (t) => {
  const root = fixture(t);
  write(root, 'skills/new-workflow/SKILL.md', '---\nname: new-workflow\ndescription: "New workflow"\n---\n');
  const result = checkSkillBusinesses(root);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.msg.includes('new-workflow')));
});

test('unknown components cannot make a distributed Skill appear mapped', (t) => {
  const root = fixture(t, { analysys: ['ae-analysis'] });
  const result = checkSkillBusinesses(root);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.level === 'P1' && finding.msg.includes('analysys')));
});

for (const groups of [
  { analysis: ['ae-analysis', 'ae-analysis'] },
  { analysis: ['ae-analysis'], agent: ['ae-analysis'] },
]) {
  test(`a Skill cannot be registered twice: ${JSON.stringify(groups)}`, (t) => {
    const root = fixture(t, groups);
    const result = checkSkillBusinesses(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.level === 'P1'
      && /duplicate/i.test(finding.msg) && finding.msg.includes('ae-analysis')));
  });
}

for (const groups of [null, [], 'analysis', { analysis: 'ae-analysis' }, { analysis: null },
  { analysis: [''] }, { analysis: [' ae-analysis'] }, { analysis: [17] }, { analysis: [{}] }]) {
  test(`an invalid registry shape produces a blocking finding: ${JSON.stringify(groups)}`, (t) => {
    const root = fixture(t, groups);
    const result = checkSkillBusinesses(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.level === 'P1' && finding.file === REGISTRY));
  });
}

for (const problem of ['missing', 'invalid-json', 'directory']) {
  test(`an unreadable registry produces a blocking finding: ${problem}`, (t) => {
    const root = fixture(t);
    const registry = path.join(root, REGISTRY);
    fs.rmSync(registry);
    if (problem === 'invalid-json') fs.writeFileSync(registry, '{');
    if (problem === 'directory') fs.mkdirSync(registry);
    const result = checkSkillBusinesses(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.level === 'P1' && finding.file === REGISTRY));
  });
}

test('a missing skills directory cannot pass the coverage check', (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, 'skills'), { recursive: true });
  const result = checkSkillBusinesses(root);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.level === 'P1' && finding.file === 'skills'));
});

test('all supported components can explicitly own a distributed Skill', (t) => {
  const groups = {
    base: ['ae-capability'], analysis: ['ae-analysis'], dataops: ['ae-dataops'],
    engage: ['ae-engage'], agent: ['ae-agent'], community: ['ae-community'], experiment: ['ae-experiment'],
  };
  const root = fixture(t, groups);
  for (const name of ['ae-capability', 'ae-dataops', 'ae-engage', 'ae-agent', 'ae-community', 'ae-experiment']) {
    write(root, `skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: "Workflow"\n---\n`);
  }
  assert.deepEqual(checkSkillBusinesses(root), { ok: true, findings: [] });
});

test('new experiment Skills from the distribution are blocked without component mappings', (t) => {
  const root = fixture(t);
  const names = ['ae-experiment', 'ae-experiment-design', 'ae-experiment-insight'];
  for (const name of names) {
    write(root, `skills/${name}/SKILL.md`, fs.readFileSync(path.join(ROOT, 'skills', name, 'SKILL.md'), 'utf8'));
  }
  const result = checkSkillBusinesses(root);
  assert.equal(result.ok, false);
  for (const name of names) {
    assert.ok(result.findings.some((finding) => finding.level === 'P1'
      && finding.msg.includes(`Skill '${name}' has no component mapping`)));
  }
});

test('new experiment Skills pass with explicit experiment component mappings', (t) => {
  const names = ['ae-experiment', 'ae-experiment-design', 'ae-experiment-insight'];
  const root = fixture(t, { analysis: ['ae-analysis'], experiment: names });
  for (const name of names) {
    write(root, `skills/${name}/SKILL.md`, fs.readFileSync(path.join(ROOT, 'skills', name, 'SKILL.md'), 'utf8'));
  }
  assert.deepEqual(checkSkillBusinesses(root), { ok: true, findings: [] });
});

test('repository maintainer Skills do not need product component mappings', (t) => {
  const root = fixture(t);
  write(root, '.agents/skills/ae-cli-release/SKILL.md', '---\nname: ae-cli-release\ndescription: "Release workflow"\n---\n');
  write(root, 'self-check/SKILL.md', '# Maintainer check\n');
  write(root, 'skills/references/notes.md', '# Not a formal Skill\n');
  assert.deepEqual(checkSkillBusinesses(root), { ok: true, findings: [] });
});

test('registered Skills may be absent from a package distribution', (t) => {
  const root = fixture(t, { analysis: ['ae-analysis'], agent: ['ae-page-context'] });
  assert.deepEqual(checkSkillBusinesses(root), { ok: true, findings: [] });
});

test('coverage uses the runtime frontmatter name rather than the directory name', (t) => {
  const root = fixture(t);
  write(root, 'skills/ae-analysis/SKILL.md', '---\nname: unmapped-workflow\ndescription: "New workflow"\n---\n');
  const result = checkSkillBusinesses(root);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.msg.includes('unmapped-workflow')
    && finding.file === 'skills/ae-analysis/SKILL.md'));
});

for (const name of ['ae-analysis', '"ae-analysis"', "'ae-analysis'", '"ae-\\u0061nalysis"']) {
  test(`directory aliases and quoted frontmatter names remain valid: ${name}`, (t) => {
    const root = fixture(t);
    fs.rmSync(path.join(root, 'skills/ae-analysis'), { recursive: true });
    write(root, 'skills/directory-alias/SKILL.md', `---\nname: ${name}\ndescription: "Analyze data"\n---\n`);
    assert.deepEqual(checkSkillBusinesses(root), { ok: true, findings: [] });
  });
}

test('two directories cannot publish the same runtime Skill name', (t) => {
  const root = fixture(t);
  write(root, 'skills/directory-alias/SKILL.md', '---\nname: "ae-analysis"\ndescription: "Analyze data"\n---\n');
  const result = checkSkillBusinesses(root);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => /duplicate/i.test(finding.msg) && finding.msg.includes('ae-analysis')));
});

for (const content of ['# No frontmatter\n', '---\nname: [\n---\n',
  '---\nname: ae-analysis\nname: ae-analysis\n---\n', '---\nname: 17\n---\n']) {
  test(`invalid runtime Skill metadata blocks coverage: ${JSON.stringify(content)}`, (t) => {
    const root = fixture(t);
    write(root, 'skills/ae-analysis/SKILL.md', content);
    const result = checkSkillBusinesses(root);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.file === 'skills/ae-analysis/SKILL.md'));
  });
}

test('the current repository has an explicit mapping for every distributed Skill', () => {
  const result = checkSkillBusinesses(ROOT);
  assert.deepEqual(result, { ok: true, findings: [] });
});

test('the release gate blocks a newly distributed Skill with no component mapping', (t) => {
  const root = sourceFixture(t);
  const invoke = () => spawnSync(process.execPath, [path.join(root, 'self-check/release-gate.mjs')], {
    cwd: root, encoding: 'utf8',
  });
  const baseline = invoke();
  assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
  write(root, 'skills/new-workflow/SKILL.md', '---\nname: new-workflow\ndescription: "New workflow"\n---\n');
  const result = invoke();
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /skill-businesses/u);
  assert.match(result.stdout, /new-workflow.*no component mapping/u);
  assert.match(result.stdout, /release-gate FAILED/u);
});

test('self-check --since validates all Skill mappings even with no changed command domains', (t) => {
  const root = sourceFixture(t);
  const git = (args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  git(['init', '--quiet']);
  git(['-c', 'user.name=Skill gate test', '-c', 'user.email=skill-gate@example.test',
    '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${path.join(root, '.git/hooks')}`,
    'commit', '--quiet', '--allow-empty', '--message=Initialize test fixture']);
  write(root, 'skills/new-workflow/SKILL.md', '---\nname: new-workflow\ndescription: "New workflow"\n---\n');
  const result = spawnSync(process.execPath, [path.join(root, 'self-check/scan.mjs'), '--since', 'HEAD', '--json'], {
    cwd: root, encoding: 'utf8',
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.focus, []);
  assert.ok(output.findings.some((finding) => finding.level === 'P1'
    && /new-workflow.*no component mapping/u.test(finding.msg)));
});

test('a missing YAML dependency returns a blocking finding without crashing the release gate', (t) => {
  const root = sourceFixture(t);
  fs.rmSync(path.join(root, 'node_modules'), { recursive: true });
  const result = spawnSync(process.execPath, [path.join(root, 'self-check/release-gate.mjs')], {
    cwd: root, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' },
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /Cannot parse Skill identities/u);
  assert.match(result.stdout, /release-gate FAILED/u);
});
