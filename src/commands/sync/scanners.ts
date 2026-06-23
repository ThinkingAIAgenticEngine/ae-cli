/**
 * Local Skill / MCP scanner
 *
 * Scans two source types:
 *   - Skill: current workspace .claude/skills/<slug>/SKILL.md
 *   - MCP:   current workspace .mcp.json
 *            current workspace .claude/.claude.json project mcpServers
 *            global ~/.claude.json project mcpServers
 *
 * Symlinks: personal Skills in the sandbox are usually symlinked to ~/.te-agent/skills/personal/<slug>/;
 * during scanning we display the symlink path rather than recursing into the target, to avoid duplicates.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, lstatSync, existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, relative, sep } from 'node:path';
import {
  readSkillManifestEntries,
  SKILL_MANIFEST_FILE,
  type SkillScope,
} from './skill-manifest.js';
import { assertValidMcpName, assertValidSkillSlug } from './validation.js';

export type SkillSource = 'workspace' | 'global';
export type McpSource = 'project' | 'local' | 'user';
export type Source = SkillSource | McpSource;
type McpManifestScope = 'personal' | 'company' | 'system';

export interface SkillCandidate {
  slug: string;
  source: SkillSource;
  workspacePath?: string;
  dirPath: string;
  filePath: string;
  content: string;
  checksum: string;
  mtime: string;
  isSymlink: boolean;
}

export interface McpCandidate {
  slug: string;
  source: McpSource;
  workspacePath?: string;
  workspaceDir?: string;
  transport: 'http' | 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  /** Indicates whether env contains sensitive fields (TOKEN/SECRET/KEY); the command layer decides whether to redact them */
  hasSecrets: boolean;
}

const SECRET_PATTERN = /TOKEN|SECRET|KEY|PASSWORD/i;
const MCP_MANIFEST_FILE = '.mcp-manifest.json';

function safeLstat(p: string) {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}

function safeReaddir(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

function readSkillFile(filePath: string): { content: string; mtime: Date } | null {
  try {
    const content = readFileSync(filePath, 'utf8');
    const stat = statSync(filePath);
    return { content, mtime: stat.mtime };
  } catch {
    return null;
  }
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function getCurrentWorkspace(home: string = process.env.HOME || homedir()): {
  dir: string;
  name: string;
} | null {
  const cwd = process.cwd();
  const wsRoot = join(home, 'workspaces');
  const rel = relative(wsRoot, cwd);

  if (rel !== '' && !rel.startsWith('..') && !rel.startsWith(sep)) {
    const name = rel.split(sep)[0];
    return { dir: join(wsRoot, name), name };
  }

  if (existsSync(join(cwd, '.claude'))) {
    return { dir: cwd, name: basename(cwd) };
  }

  return null;
}

function readSkillScopeIndex(skillsRoot: string): Map<string, SkillScope> {
  const entries = readSkillManifestEntries(join(skillsRoot, SKILL_MANIFEST_FILE));
  return new Map(entries.map((entry) => [entry.dirName, entry.scope]));
}

function scanSkillsInDir(dir: string, source: SkillSource, workspacePath?: string): SkillCandidate[] {
  if (!existsSync(dir)) return [];
  const out: SkillCandidate[] = [];
  const scopeIndex = readSkillScopeIndex(dir);
  for (const slug of safeReaddir(dir)) {
    const scope = scopeIndex.get(slug);
    if (scope === 'system' || scope === 'company') continue;
    const slugDir = join(dir, slug);
    const lst = safeLstat(slugDir);
    if (!lst) continue;
    const isSymlink = lst.isSymbolicLink();
    let isDir = lst.isDirectory();
    if (isSymlink) {
      try {
        isDir = statSync(slugDir).isDirectory();
      } catch {
        continue;
      }
    }
    if (!isDir) continue;
    const filePath = join(slugDir, 'SKILL.md');
    if (!existsSync(filePath)) continue;
    assertValidSkillSlug(slug);
    const file = readSkillFile(filePath);
    if (!file) continue;
    out.push({
      slug,
      source,
      workspacePath,
      dirPath: slugDir,
      filePath,
      content: file.content,
      checksum: sha256(file.content),
      mtime: file.mtime.toISOString(),
      isSymlink,
    });
  }
  return out;
}

export function scanSkills(): SkillCandidate[] {
  const home = process.env.HOME || homedir();
  const workspace = getCurrentWorkspace(home);
  if (!workspace) return [];
  return scanSkillsInDir(join(workspace.dir, '.claude', 'skills'), 'workspace', workspace.name);
}

function readJsonSafe(p: string): any | null {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function isMcpManifestScope(value: unknown): value is McpManifestScope {
  return value === 'personal' || value === 'company' || value === 'system';
}

function readMcpManifestScopes(workspaceDir: string): Map<string, McpManifestScope> {
  const parsed = readJsonSafe(join(workspaceDir, MCP_MANIFEST_FILE));
  const scopes = new Map<string, McpManifestScope>();
  if (!Array.isArray(parsed)) return scopes;
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as { name?: unknown; scope?: unknown };
    if (typeof entry.name !== 'string' || !isMcpManifestScope(entry.scope)) continue;
    if (scopes.has(entry.name)) continue;
    scopes.set(entry.name, entry.scope);
  }
  return scopes;
}

function detectSecrets(env: Record<string, string> | undefined): boolean {
  if (!env) return false;
  return Object.keys(env).some((k) => SECRET_PATTERN.test(k));
}

function parseMcpServers(
  servers: Record<string, any> | undefined,
  source: McpSource,
  workspacePath?: string,
  workspaceDir?: string,
  options: { excludedNames?: Set<string> } = {},
): McpCandidate[] {
  if (!servers || typeof servers !== 'object') return [];
  const out: McpCandidate[] = [];
  for (const [slug, raw] of Object.entries(servers)) {
    if (!raw || typeof raw !== 'object') continue;
    if (options.excludedNames?.has(slug)) continue;
    assertValidMcpName(slug);
    // Support both the type and transport field names.
    const rawTransport = raw.transport ?? raw.type;
    const transport: 'http' | 'sse' | 'stdio' =
      rawTransport === 'sse'
        ? 'sse'
        : rawTransport === 'http' || typeof raw.url === 'string'
          ? 'http'
          : 'stdio';
    const env = (raw.env && typeof raw.env === 'object' ? raw.env : undefined) as
      | Record<string, string>
      | undefined;
    const headers = (raw.headers && typeof raw.headers === 'object' ? raw.headers : undefined) as
      | Record<string, string>
      | undefined;
    out.push({
      slug,
      source,
      workspacePath,
      workspaceDir,
      transport,
      url: typeof raw.url === 'string' ? raw.url : undefined,
      command: typeof raw.command === 'string' ? raw.command : undefined,
      args: Array.isArray(raw.args) ? raw.args.map(String) : undefined,
      env,
      headers,
      hasSecrets: detectSecrets(env),
    });
  }
  return out;
}

function normalizeProjectPath(p: string): string {
  const trimmed = p.replace(/\/+$/, '');
  try {
    return statSync(trimmed).isDirectory() ? realpathSync(trimmed).replace(/\/+$/, '') : trimmed;
  } catch {
    return trimmed;
  }
}

function projectMcpServers(data: any, workspaceDir: string): Record<string, any> | undefined {
  const projects = data?.projects;
  if (!projects || typeof projects !== 'object') return undefined;

  const normalizedWorkspaceDir = workspaceDir.replace(/\/+$/, '');
  const project =
    projects[normalizedWorkspaceDir] ||
    projects[`${normalizedWorkspaceDir}/`] ||
    projects[process.cwd()] ||
    projects[process.cwd().replace(/\/+$/, '')];
  if (project && typeof project === 'object') return project.mcpServers;

  const realWorkspaceDir = normalizeProjectPath(workspaceDir);
  for (const [projectPath, projectConfig] of Object.entries(projects)) {
    if (normalizeProjectPath(projectPath) !== realWorkspaceDir) continue;
    return projectConfig && typeof projectConfig === 'object'
      ? (projectConfig as Record<string, any>).mcpServers
      : undefined;
  }
  return undefined;
}

export function scanMcps(): McpCandidate[] {
  const home = process.env.HOME || homedir();
  const workspace = getCurrentWorkspace(home);
  if (!workspace) return [];
  const out: McpCandidate[] = [];

  const scopedMcpJson = readJsonSafe(join(workspace.dir, '.mcp.json'));
  const projectManifestScopes = readMcpManifestScopes(workspace.dir);
  const excludedProjectMcps = new Set(
    [...projectManifestScopes.entries()]
      .filter(([, scope]) => scope === 'system' || scope === 'company')
      .map(([name]) => name),
  );
  out.push(
    ...parseMcpServers(
      scopedMcpJson?.mcpServers,
      'project',
      workspace.name,
      workspace.dir,
      { excludedNames: excludedProjectMcps },
    ),
  );

  const workspaceClaudeJson = readJsonSafe(join(workspace.dir, '.claude', '.claude.json'));
  out.push(
    ...parseMcpServers(
      projectMcpServers(workspaceClaudeJson, workspace.dir),
      'local',
      workspace.name,
      undefined,
    ),
  );

  const globalClaudeJson = readJsonSafe(join(home, '.claude.json'));
  out.push(
    ...parseMcpServers(
      projectMcpServers(globalClaudeJson, workspace.dir),
      'user',
      undefined,
      undefined,
    ),
  );

  return out;
}

export function splitPushableMcps(candidates: McpCandidate[]): {
  supported: McpCandidate[];
  unsupportedStdio: McpCandidate[];
} {
  return {
    supported: candidates.filter((mcp) => mcp.transport === 'http' || mcp.transport === 'sse'),
    unsupportedStdio: candidates.filter((mcp) => mcp.transport === 'stdio'),
  };
}

export function describeSource(_c: { source: Source; workspacePath?: string }): string | undefined {
  return undefined;
}

export { basename };
