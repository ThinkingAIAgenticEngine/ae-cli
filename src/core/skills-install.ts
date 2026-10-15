import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { commandSucceeded, type ProcessResult } from './install-process.js';

export interface BundledSkill { name: string; files: Map<string, Buffer> }
export interface SkillFailure { skill: string; reason: string }

export function globalSkillsDirectory(): string {
  return path.join(os.homedir(), '.agents', 'skills');
}

function skillName(content: string): string {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) throw new Error('Missing YAML frontmatter.');
  const parsed = parseDocument(frontmatter[1], { uniqueKeys: true });
  if (parsed.errors.length) throw new Error('Invalid YAML frontmatter.');
  const data = parsed.toJS({ maxAliasCount: 100 });
  if (!data || typeof data.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.name)
    || typeof data.description !== 'string' || !data.description.trim()) throw new Error('Invalid Skill metadata.');
  return data.name;
}

function readFiles(root: string, prefix = '', files = new Map<string, Buffer>()): Map<string, Buffer> {
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    // Match the pinned Skills tool's copy exclusions.
    if (entry.name.startsWith('.') || ['metadata.json', '__pycache__', '__pypackages__'].includes(entry.name)) continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Bundled Skills must contain regular files.');
    if (entry.isDirectory()) readFiles(root, relative, files);
    else if (entry.isFile()) files.set(relative, fs.readFileSync(path.join(root, relative)));
  }
  return files;
}

/** Snapshot the target package at runtime; historical releases need no generated manifest. */
export function readBundledSkills(directory: string): BundledSkill[] {
  const skills = fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => {
      try {
        const files = readFiles(path.join(directory, entry.name));
        return { name: skillName(files.get('SKILL.md')!.toString('utf8')), files };
      } catch {
        const name = /^[a-z0-9-]+$/.test(entry.name) ? entry.name : '(invalid name)';
        throw new Error(`Invalid bundled Skill ${name}: missing files or YAML/frontmatter error.`);
      }
    });
  if (!skills.length || new Set(skills.map(skill => skill.name)).size !== skills.length) {
    throw new Error('Bundled Skills are empty or contain duplicate names.');
  }
  return skills;
}

export function verifyGlobalSkills(skills: BundledSkill[], directory: string): SkillFailure[] {
  return skills.flatMap(skill => {
    let reason = '';
    try {
      const target = path.join(directory, skill.name);
      if (skillName(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8')) !== skill.name) {
        reason = 'Installed Skill name does not match the bundled Skill.';
      } else {
        for (const [file, expected] of skill.files) {
          if (!fs.readFileSync(path.join(target, file)).equals(expected)) {
            reason = 'Installed files do not match the CLI package version.';
            break;
          }
        }
      }
    } catch (error) {
      reason = (error as NodeJS.ErrnoException).code === 'ENOENT'
        ? 'Expected Skill file is missing.' : 'Installed Skill has invalid YAML/frontmatter or unreadable files.';
    }
    return reason ? [{ skill: skill.name, reason }] : [];
  });
}

/** The pinned tool can exit zero with per-client failures. Never pass its raw logs to users. */
export function skillProcessProblem(result: ProcessResult): string | null {
  const output = `${result.stdout}\n${result.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
  if (/(?:YAML|frontmatter)[^\n]*(?:parse|invalid|error)|(?:parse|invalid|error)[^\n]*(?:YAML|frontmatter)/i.test(output)) {
    return 'Skills reported a YAML/frontmatter parsing error.';
  }
  const lines = output.split(/\r?\n/);
  const ignored = lines.filter(line => /(?:PromptScript|Eve) does not support global skill installation\s*$/.test(line));
  const failures = [...output.matchAll(/Failed to install (\d+)/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  const remaining = lines.filter(line => !ignored.includes(line) && !/Failed to install \d+/.test(line)).join('\n');
  if (failures > ignored.length || /✗|(?:^|\n)[^\w\n]*(?:Error\b|Installation failed\b|Failed\b)/i.test(remaining)) {
    return 'Skills installation failed for a supported client. Check directory permissions and retry.';
  }
  if (commandSucceeded(result)) return null;
  if (!result.error && !result.signal && ignored.length > 0 && failures === ignored.length
    && !/EACCES|EPERM|ETIMEDOUT|ENOTFOUND|ECONN|network|permission denied/i.test(remaining)) return null;
  return 'Skills process failed. Check network access and directory permissions, then retry.';
}
