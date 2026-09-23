import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { syncSkillCollaboration } from '../scripts/sync-skill-collaboration.mjs';
import { run as releaseCheck } from '../self-check/checks/skill-collaboration.mjs';

// Independent expected distribution, from the user-approved participant list.
const participants = [
  'ae-analysis', 'ae-capability', 'ae-community', 'ae-data-integration', 'ae-dataops',
  'ae-engage', 'ae-generate-tracking-plan', 'ae-kb', 'ae-kb-discovery', 'ae-metadata',
];
const sourcePath = 'docs/skill-contracts/collaboration.md';
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'skill-collaboration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'docs/skill-contracts'), { recursive: true });
  writeFileSync(path.join(root, sourcePath), '# Collaboration v1\n\nFind a capability, not a fixed name.\n');
  for (const name of participants) {
    mkdirSync(path.join(root, 'skills', name), { recursive: true });
    writeFileSync(path.join(root, 'skills', name, 'SKILL.md'),
      `# ${name}\n\n[Collaboration](references/collaboration.md)\n`);
  }
  return root;
}

test('sync distributes standalone protocol copies and a second sync changes nothing', (t) => {
  const root = fixture(t);
  const result = syncSkillCollaboration({ root });
  assert.equal(result.ok, true);
  assert.deepEqual(result.written, participants.map((name) => `skills/${name}/references/collaboration.md`));
  for (const name of participants) {
    const body = readFileSync(path.join(root, 'skills', name, 'references/collaboration.md'), 'utf8');
    assert.match(body, /Generated from docs\/skill-contracts\/collaboration.md/);
    assert.ok(body.endsWith('# Collaboration v1\n\nFind a capability, not a fixed name.\n'));
  }
  assert.deepEqual(syncSkillCollaboration({ root }).written, []);
  assert.equal(syncSkillCollaboration({ root, check: true }).ok, true);
});

test('check reports missing and edited copies without repairing either', (t) => {
  const root = fixture(t);
  syncSkillCollaboration({ root });
  const edited = path.join(root, 'skills/ae-analysis/references/collaboration.md');
  const missing = path.join(root, 'skills/ae-engage/references/collaboration.md');
  writeFileSync(edited, 'local edit');
  rmSync(missing);
  const result = syncSkillCollaboration({ root, check: true });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  assert.deepEqual(result.written, []);
  assert.equal(readFileSync(edited, 'utf8'), 'local edit');
  assert.equal(existsSync(missing), false);
});

test('missing participant or protocol pointer fails before any copies are written', (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'skills/ae-engage/SKILL.md'), '# No collaboration pointer\n');
  rmSync(path.join(root, 'skills/ae-metadata/SKILL.md'));
  const result = syncSkillCollaboration({ root });
  assert.equal(result.ok, false);
  assert.deepEqual(result.written, []);
  assert.equal(existsSync(path.join(root, 'skills/ae-analysis/references')), false);
});

test('sync rejects a linked output instead of overwriting its destination', (t) => {
  const root = fixture(t);
  const outside = path.join(root, 'unrelated.md');
  writeFileSync(outside, 'preserve me');
  mkdirSync(path.join(root, 'skills/ae-analysis/references'));
  symlinkSync(outside, path.join(root, 'skills/ae-analysis/references/collaboration.md'));
  const result = syncSkillCollaboration({ root });
  assert.equal(result.ok, false);
  assert.deepEqual(result.written, []);
  assert.equal(readFileSync(outside, 'utf8'), 'preserve me');
});

test('release check rejects source drift and sync repairs it without editing Skill bodies', (t) => {
  const root = fixture(t);
  syncSkillCollaboration({ root });
  const before = participants.map((name) => readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8'));
  writeFileSync(path.join(root, sourcePath), '# Updated convention\n');
  assert.equal(releaseCheck({ root }).ok, false);
  assert.equal(syncSkillCollaboration({ root }).written.length, 10);
  assert.equal(releaseCheck({ root }).ok, true);
  assert.deepEqual(participants.map((name) => readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8')), before);
});

test('missing or empty source fails without creating output packages', (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, sourcePath), '  \n');
  assert.throws(() => syncSkillCollaboration({ root }), /must not be empty/);
  rmSync(path.join(root, sourcePath));
  assert.throws(() => releaseCheck({ root }), /ENOENT/);
  assert.equal(existsSync(path.join(root, 'skills/ae-analysis/references')), false);
});

test('CLI rejects unknown arguments rather than accidentally rewriting packages', () => {
  const result = spawnSync(process.execPath, ['scripts/sync-skill-collaboration.mjs', '--chek'], {
    cwd: repositoryRoot, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
});

test('each shipped package carries the same name-independent protocol without its source repository', (t) => {
  assert.equal(releaseCheck({ root: repositoryRoot }).ok, true);
  const root = mkdtempSync(path.join(tmpdir(), 'skill-collaboration-packages-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of participants) {
    const installed = path.join(root, name);
    cpSync(path.join(repositoryRoot, 'skills', name), installed, { recursive: true });
    const skill = readFileSync(path.join(installed, 'SKILL.md'), 'utf8');
    if (['ae-analysis', 'ae-metadata', 'ae-engage'].includes(name)) {
      assert.match(skill, /## Capability contract/);
    }
    assert.match(skill, /\]\(references\/collaboration\.md\)/);
    const protocol = path.join(installed, 'references/collaboration.md');
    assert.equal(lstatSync(protocol).isFile(), true);
    const body = readFileSync(protocol, 'utf8');
    assert.equal(participants.some((participant) => body.includes(participant)), false);
    assert.doesNotMatch(body, /route_to|\.\.\//);
    assert.match(body, /descriptions available in this run/);
    assert.match(body, /original request/);
  }
  assert.equal(existsSync(path.join(root, 'docs')), false);
});

test('draft-only engagement workflow does not unconditionally submit approval', () => {
  const skill = readFileSync(path.join(repositoryRoot, 'skills/ae-engage/SKILL.md'), 'utf8');
  const draftWorkflow = skill.split('For task draft creation or update, use this workflow:')[1]
    .split('`engage-task task build-save-guide` is a read-only helper.')[0];
  assert.doesNotMatch(draftWorkflow, /^\d+\..*submit-approval/m);
});
