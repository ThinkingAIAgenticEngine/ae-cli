import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  updateMcpManifestForProjectSource,
  updateSkillManifestForSource,
} from '../src/commands/sync/local-copy.js';

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(
      `    ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

function readManifest(manifestPath: string): unknown {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

const tmpRoot = mkdtempSync(path.join(tmpdir(), 'ae-cli-sync-local-copy-'));
process.stdout.write(`tmp: ${tmpRoot}\n`);

try {
  test('updateSkillManifestForSource creates .skill-manifest.json when missing', () => {
    const skillsRoot = path.join(tmpRoot, 'workspace-a', '.claude', 'skills');
    const skillDir = path.join(skillsRoot, 'analysis-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '# analysis\n', 'utf8');

    const result = updateSkillManifestForSource(skillDir, 'analysis-skill');

    assert.equal(result.changed, true);
    assert.equal(
      result.manifestPath,
      path.join(skillsRoot, '.skill-manifest.json'),
    );
    assert.deepEqual(readManifest(result.manifestPath), [
      { dirName: 'analysis-skill', scope: 'personal' },
    ]);
  });

  test('updateSkillManifestForSource appends missing v2 entry and does not duplicate', () => {
    const skillsRoot = path.join(tmpRoot, 'workspace-b', '.claude', 'skills');
    const skillDir = path.join(skillsRoot, 'test1-skill');
    const manifestPath = path.join(skillsRoot, '.skill-manifest.json');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '# test1\n', 'utf8');
    writeFileSync(
      manifestPath,
      JSON.stringify(
        [{ dirName: 'analysis-skill', scope: 'personal' }],
        null,
        2,
      ) + '\n',
      'utf8',
    );

    const first = updateSkillManifestForSource(skillDir, 'test1-skill');
    const second = updateSkillManifestForSource(skillDir, 'test1-skill');

    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.deepEqual(readManifest(manifestPath), [
      { dirName: 'analysis-skill', scope: 'personal' },
      { dirName: 'test1-skill', scope: 'personal' },
    ]);
  });

  test('Skill slug validation rejects leading, trailing, repeated hyphen and overlong names', () => {
    const skillsRoot = path.join(tmpRoot, 'workspace-c', '.claude', 'skills');
    const skillDir = path.join(skillsRoot, 'valid-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), '# valid\n', 'utf8');

    for (const invalidSlug of ['-bad', 'bad-', 'bad--slug', 'a'.repeat(49)]) {
      assert.throws(
        () => updateSkillManifestForSource(skillDir, invalidSlug),
        /非法 Skill slug/,
      );
    }
  });

  test('updateMcpManifestForProjectSource creates .mcp-manifest.json when missing', () => {
    const workspaceDir = path.join(tmpRoot, 'workspace-mcp-a');
    mkdirSync(workspaceDir, { recursive: true });

    const result = updateMcpManifestForProjectSource(workspaceDir, 'analysis_mcp');

    assert.equal(result.changed, true);
    assert.equal(result.manifestPath, path.join(workspaceDir, '.mcp-manifest.json'));
    assert.deepEqual(readManifest(result.manifestPath), [
      { name: 'analysis_mcp', scope: 'personal' },
    ]);
  });

  test('updateMcpManifestForProjectSource appends missing entry and does not duplicate', () => {
    const workspaceDir = path.join(tmpRoot, 'workspace-mcp-b');
    const manifestPath = path.join(workspaceDir, '.mcp-manifest.json');
    mkdirSync(workspaceDir, { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify([{ name: 'old_mcp', scope: 'company' }], null, 2) + '\n',
      'utf8',
    );

    const first = updateMcpManifestForProjectSource(workspaceDir, 'new-mcp');
    const second = updateMcpManifestForProjectSource(workspaceDir, 'new-mcp');

    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.deepEqual(readManifest(manifestPath), [
      { name: 'old_mcp', scope: 'company' },
      { name: 'new-mcp', scope: 'personal' },
    ]);
  });

  test('MCP name validation rejects names not accepted by main app', () => {
    const workspaceDir = path.join(tmpRoot, 'workspace-mcp-c');
    mkdirSync(workspaceDir, { recursive: true });

    for (const invalidName of ['1bad', 'bad space', 'a'.repeat(65)]) {
      assert.throws(
        () => updateMcpManifestForProjectSource(workspaceDir, invalidName),
        /非法 MCP name/,
      );
    }
  });
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
