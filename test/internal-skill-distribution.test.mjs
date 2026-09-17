/** Run with node --test test/internal-skill-distribution.test.mjs. */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkSkillInternalDistribution } from '../self-check/checks/skill-internal-distribution.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INTERNAL_PACKAGE = {
  name: '@tant/ae-cli',
  version: '6.0.0',
  repository: { url: 'ssh://git@gitlab.thinkingdata.cn:2222/te-ai/te-cli.git' },
  files: ['skills/'],
};

function fixture(t, pkg = INTERNAL_PACKAGE) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-internal-distribution-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'package.json', JSON.stringify(pkg));
  return root;
}

function write(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function addPrivatePackage(root) {
  write(root, 'skills/ae-page-context/SKILL.md', '---\nname: ae-page-context\ndescription: "Internal page context"\n---\n# Internal\n');
  write(root, 'skills/ae-page-context/runtime.json', '{"version":1}');
  write(root, 'skills/ae-page-context/references/nested/context.md', '# Internal dictionary\n');
}

function prepareConversion(root) {
  write(root, 'src/core/internal-call-source.ts', "export function internalCallSourceHeaders() { return { 'X-Source': 'internal' }; }\n");
  for (const relative of ['src/core/mcp.ts', 'src/core/capability-api.ts', 'src/commands/te-dataops/shared.ts']) {
    write(root, relative, '// Fixture source.\n');
  }
  write(root, 'open-source/README.opensource.md', '# Public CLI\n');
  write(root, 'open-source/README.opensource.zh.md', '# Public CLI\n');
  fs.copyFileSync(path.join(ROOT, 'open-source/config-open-source.sh'), path.join(root, 'open-source/config-open-source.sh'));
}

function convert(root) {
  return spawnSync('bash', [path.join(root, 'open-source/config-open-source.sh')], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}` },
  });
}

test('internal packages may retain the complete page-context Skill', (t) => {
  const root = fixture(t);
  addPrivatePackage(root);
  assert.deepEqual(checkSkillInternalDistribution(root), { ok: true, findings: [] });
});

test('the public npm identity rejects residual references even without SKILL.md', (t) => {
  const root = fixture(t, { ...INTERNAL_PACKAGE, name: '@thinkingai/ae-cli' });
  write(root, 'skills/ae-page-context/references/context.md', '# Internal dictionary\n');
  const result = checkSkillInternalDistribution(root);
  assert.equal(result.ok, false);
  assert.equal(result.findings[0].level, 'P1');
});

test('the public Git identity rejects the internal package before npm renaming', (t) => {
  for (const repository of [
    { url: 'https://github.com/ThinkingAIAgenticEngine/ae-cli.git' },
    'git@github.com:ThinkingAIAgenticEngine/ae-cli.git',
  ]) {
    const root = fixture(t, { ...INTERNAL_PACKAGE, repository });
    addPrivatePackage(root);
    assert.equal(checkSkillInternalDistribution(root).ok, false);
  }
});

test('public packages without this Skill pass, but dangling entries fail', (t) => {
  const root = fixture(t, { ...INTERNAL_PACKAGE, name: '@thinkingai/ae-cli' });
  assert.equal(checkSkillInternalDistribution(root).ok, true);
  fs.mkdirSync(path.join(root, 'skills'));
  fs.symlinkSync(path.join(root, 'missing'), path.join(root, 'skills/ae-page-context'));
  assert.equal(checkSkillInternalDistribution(root).ok, false);
});

test('public conversion removes the entire internal package and preserves sibling Skills', (t) => {
  const root = fixture(t);
  prepareConversion(root);
  addPrivatePackage(root);
  const sibling = '---\nname: ae-capability\ndescription: "Public capabilities"\n---\n# Capabilities\n';
  write(root, 'skills/ae-capability/SKILL.md', sibling);
  const result = convert(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(root, 'skills/ae-page-context')), false);
  assert.equal(fs.readFileSync(path.join(root, 'skills/ae-capability/SKILL.md'), 'utf8'), sibling);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).name, '@thinkingai/ae-cli');
  assert.equal(checkSkillInternalDistribution(root).ok, true);
});

test('public conversion refuses a symlinked skills parent without deleting its target', (t) => {
  const root = fixture(t);
  prepareConversion(root);
  write(root, 'linked-skills/ae-page-context/keep.md', 'Keep this file.');
  fs.symlinkSync(path.join(root, 'linked-skills'), path.join(root, 'skills'));
  const result = convert(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /regular skills\/ directory/u);
  assert.equal(fs.readFileSync(path.join(root, 'linked-skills/ae-page-context/keep.md'), 'utf8'), 'Keep this file.');
});

test('check:release runs the internal-distribution gate in the public source copy', (t) => {
  const root = fixture(t, { ...INTERNAL_PACKAGE, name: '@thinkingai/ae-cli' });
  addPrivatePackage(root);
  fs.cpSync(path.join(ROOT, 'self-check'), path.join(root, 'self-check'), { recursive: true });
  const result = spawnSync(process.execPath, [path.join(root, 'self-check/release-gate.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /skill-internal-distribution/u);
  assert.match(result.stdout, /internal-only/u);
});
