import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export type SkillScope = 'personal' | 'company' | 'system';

export interface SkillManifestEntry {
  dirName: string;
  scope: SkillScope;
}

export const SKILL_MANIFEST_FILE = '.skill-manifest.json';

export function isSkillScope(value: unknown): value is SkillScope {
  return value === 'personal' || value === 'company' || value === 'system';
}

function uniqueEntries(entries: SkillManifestEntry[]): SkillManifestEntry[] {
  const seen = new Set<string>();
  const out: SkillManifestEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.dirName)) continue;
    seen.add(entry.dirName);
    out.push(entry);
  }
  return out;
}

export function readSkillManifestEntries(
  manifestPath: string,
): SkillManifestEntry[] {
  if (!existsSync(manifestPath)) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return [];
  }

  if (Array.isArray(parsed)) {
    const entries: SkillManifestEntry[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as { dirName?: unknown; scope?: unknown };
      if (typeof entry.dirName !== 'string' || !isSkillScope(entry.scope))
        continue;
      entries.push({ dirName: entry.dirName, scope: entry.scope });
    }
    return uniqueEntries(entries);
  }

  return [];
}

export function writeSkillManifestEntries(
  manifestPath: string,
  entries: SkillManifestEntry[],
): void {
  writeFileSync(
    manifestPath,
    JSON.stringify(uniqueEntries(entries), null, 2) + '\n',
    'utf8',
  );
}
