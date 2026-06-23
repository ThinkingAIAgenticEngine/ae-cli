import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  readSkillManifestEntries,
  SKILL_MANIFEST_FILE,
  writeSkillManifestEntries,
  type SkillManifestEntry,
} from './skill-manifest.js';
import { assertValidMcpName, assertValidSkillSlug } from './validation.js';

export interface CopySkillPackageResult {
  targetDir: string;
  skipped: boolean;
}

export interface UpdateSkillManifestResult {
  manifestPath: string;
  changed: boolean;
}

type McpManifestEntry = {
  name: string;
  scope: 'personal' | 'company' | 'system';
};

const MCP_MANIFEST_FILE = '.mcp-manifest.json';

function isMcpScope(value: unknown): value is McpManifestEntry['scope'] {
  return value === 'personal' || value === 'company' || value === 'system';
}

function uniqueMcpEntries(entries: McpManifestEntry[]): McpManifestEntry[] {
  const seen = new Set<string>();
  const out: McpManifestEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.name)) continue;
    seen.add(entry.name);
    out.push(entry);
  }
  return out;
}

function readMcpManifestEntries(manifestPath: string): McpManifestEntry[] {
  if (!existsSync(manifestPath)) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const entries: McpManifestEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as { name?: unknown; scope?: unknown };
    if (typeof entry.name !== 'string' || !isMcpScope(entry.scope)) continue;
    entries.push({ name: entry.name, scope: entry.scope });
  }
  return uniqueMcpEntries(entries);
}

function writeMcpManifestEntries(
  manifestPath: string,
  entries: McpManifestEntry[],
): void {
  writeFileSync(
    manifestPath,
    JSON.stringify(uniqueMcpEntries(entries), null, 2) + '\n',
    'utf8',
  );
}

export function updateSkillManifestForSource(
  sourceDir: string,
  slug: string,
): UpdateSkillManifestResult {
  assertValidSkillSlug(slug);

  const sourceAbs = path.resolve(sourceDir);
  if (!statSync(sourceAbs).isDirectory()) {
    throw new Error(`Skill source path is not a directory: ${sourceDir}`);
  }

  const manifestPath = path.join(path.dirname(sourceAbs), SKILL_MANIFEST_FILE);
  const manifest = readSkillManifestEntries(manifestPath);
  const nextEntry: SkillManifestEntry = { dirName: slug, scope: 'personal' };
  const existingIndex = manifest.findIndex((entry) => entry.dirName === slug);

  if (existingIndex >= 0 && manifest[existingIndex].scope === nextEntry.scope) {
    return { manifestPath, changed: false };
  }

  const nextManifest = manifest.slice();
  if (existingIndex >= 0) {
    nextManifest[existingIndex] = nextEntry;
  } else {
    nextManifest.push(nextEntry);
  }
  writeSkillManifestEntries(manifestPath, nextManifest);
  return { manifestPath, changed: true };
}

export function updateMcpManifestForProjectSource(
  workspaceDir: string,
  name: string,
): UpdateSkillManifestResult {
  assertValidMcpName(name);

  const workspaceAbs = path.resolve(workspaceDir);
  if (!statSync(workspaceAbs).isDirectory()) {
    throw new Error(`MCP workspace path is not a directory: ${workspaceDir}`);
  }

  const manifestPath = path.join(workspaceAbs, MCP_MANIFEST_FILE);
  const manifest = readMcpManifestEntries(manifestPath);
  const nextEntry: McpManifestEntry = { name, scope: 'personal' };
  const existingIndex = manifest.findIndex((entry) => entry.name === name);

  if (existingIndex >= 0 && manifest[existingIndex].scope === nextEntry.scope) {
    return { manifestPath, changed: false };
  }

  const nextManifest = manifest.slice();
  if (existingIndex >= 0) {
    nextManifest[existingIndex] = nextEntry;
  } else {
    nextManifest.push(nextEntry);
  }
  writeMcpManifestEntries(manifestPath, nextManifest);
  return { manifestPath, changed: true };
}

export function copySkillPackageToTarget(args: {
  sourceDir: string;
  targetRoot: string;
  slug: string;
}): CopySkillPackageResult {
  assertValidSkillSlug(args.slug);
  if (!path.isAbsolute(args.targetRoot)) {
    throw new Error(`skillTargetRoot must be an absolute path: ${args.targetRoot}`);
  }

  const sourceReal = realpathSync(args.sourceDir);
  if (!statSync(sourceReal).isDirectory()) {
    throw new Error(`Skill source path is not a directory: ${args.sourceDir}`);
  }

  const targetDir = path.join(args.targetRoot, args.slug);
  const targetAbs = path.resolve(targetDir);
  if (
    targetAbs === sourceReal ||
    targetAbs.startsWith(`${sourceReal}${path.sep}`)
  ) {
    return { targetDir, skipped: true };
  }

  if (existsSync(targetDir)) {
    const targetReal = realpathSync(targetDir);
    if (targetReal === sourceReal) {
      return { targetDir, skipped: true };
    }
    rmSync(targetDir, { recursive: true, force: true });
  }

  mkdirSync(args.targetRoot, { recursive: true });
  cpSync(sourceReal, targetDir, { recursive: true, dereference: true });
  return { targetDir, skipped: false };
}
