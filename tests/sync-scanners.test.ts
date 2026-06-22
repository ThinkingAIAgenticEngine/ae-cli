/**
 * ae-cli sync scanner unit tests
 *
 * Run:
 *   npx tsx tests/sync-scanners.test.ts
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describeSource,
  scanMcps,
  scanSkills,
} from '../src/commands/sync/scanners.ts';

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

function writeSkill(root: string, slug: string) {
  const dir = join(root, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${slug}\ndescription: "${slug}"\n---\n\n# ${slug}\n`,
    'utf8',
  );
}

function writeSkillManifest(
  root: string,
  skills: Array<{ dirName: string; scope: 'personal' | 'company' | 'system' }>,
) {
  writeFileSync(
    join(root, '.skill-manifest.json'),
    JSON.stringify(skills, null, 2),
    'utf8',
  );
}

const tmpRoot = mkdtempSync(join(tmpdir(), 'ae-cli-sync-scanners-'));
const prevHome = process.env.HOME;
const prevCwd = process.cwd();
process.env.HOME = tmpRoot;
process.stdout.write(`tmp: ${tmpRoot}\n`);

try {
  test('scanSkills only scans the current workspace and skips company/system skills per v2 manifest', () => {
    const otherWorkspaceSkillsRoot = join(
      tmpRoot,
      'workspaces',
      'wqa12',
      '.claude',
      'skills',
    );
    writeSkill(otherWorkspaceSkillsRoot, 'other-workspace-skill');

    const currentWorkspace = join(tmpRoot, 'workspaces', 'wqa13');
    const currentWorkspaceSkillsRoot = join(
      currentWorkspace,
      '.claude',
      'skills',
    );
    writeSkill(currentWorkspaceSkillsRoot, 'personal-skill');
    writeSkill(currentWorkspaceSkillsRoot, 'company-skill');
    writeSkill(currentWorkspaceSkillsRoot, 'system-skill');
    writeSkill(currentWorkspaceSkillsRoot, 'self-installed-skill');
    writeSkillManifest(currentWorkspaceSkillsRoot, [
      { dirName: 'personal-skill', scope: 'personal' },
      { dirName: 'company-skill', scope: 'company' },
      { dirName: 'system-skill', scope: 'system' },
    ]);
    process.chdir(currentWorkspace);

    const skills = scanSkills();

    assert.deepEqual(skills.map((skill) => skill.slug).sort(), [
      'personal-skill',
      'self-installed-skill',
    ]);
    assert.equal(skills[0]?.workspacePath, 'wqa13');
    assert.equal(describeSource(skills[0]), undefined);
  });

  test('scanMcps scans current .mcp.json, workspace .claude/.claude.json, and global ~/.claude.json', () => {
    const currentWorkspace = join(tmpRoot, 'workspaces', 'wqa13');
    const currentWorkspaceClaudeRoot = join(currentWorkspace, '.claude');
    mkdirSync(currentWorkspaceClaudeRoot, { recursive: true });
    process.chdir(currentWorkspace);

    writeFileSync(
      join(currentWorkspace, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          scoped_personal_mcp: {
            type: 'http',
            url: 'http://example.com/personal',
            headers: { 'Header-Key': 'Header-Value' },
            _scope: 'personal',
          },
          scoped_self_installed_mcp: {
            type: 'http',
            url: 'http://example.com/self-installed',
          },
          scoped_system_mcp: {
            type: 'http',
            url: 'http://example.com/system',
            _scope: 'system',
          },
          scoped_company_mcp: {
            type: 'http',
            url: 'http://example.com/company',
            _scope: 'company',
          },
        },
      }),
      'utf8',
    );
    writeFileSync(
      join(currentWorkspaceClaudeRoot, '.claude.json'),
      JSON.stringify({
        projects: {
          [currentWorkspace]: {
            mcpServers: {
              workspace_claude_mcp: {
                type: 'http',
                url: 'http://example.com/workspace-claude',
              },
            },
          },
        },
      }),
      'utf8',
    );
    writeFileSync(
      join(tmpRoot, '.claude.json'),
      JSON.stringify({
        projects: {
          [currentWorkspace]: {
            mcpServers: {
              global_claude_mcp: {
                type: 'stdio',
                command: 'npx',
                args: ['-y', 'mcp-server-calculator'],
                env: {},
              },
            },
          },
          [join(tmpRoot, 'workspaces', 'wqa12')]: {
            mcpServers: {
              other_project_mcp: {
                type: 'http',
                url: 'http://example.com/other-project',
              },
            },
          },
        },
      }),
      'utf8',
    );

    const mcps = scanMcps();

    assert.deepEqual(mcps.map((mcp) => mcp.slug).sort(), [
      'global_claude_mcp',
      'scoped_personal_mcp',
      'scoped_self_installed_mcp',
      'workspace_claude_mcp',
    ]);
    const scopedPersonal = mcps.find(
      (mcp) => mcp.slug === 'scoped_personal_mcp',
    );
    assert.deepEqual(scopedPersonal?.headers, { 'Header-Key': 'Header-Value' });
    assert.equal(describeSource(scopedPersonal!), undefined);
  });
} finally {
  process.chdir(prevCwd);
  if (prevHome === undefined) delete process.env.HOME;
  else process.env.HOME = prevHome;
  rmSync(tmpRoot, { recursive: true, force: true });
}

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
