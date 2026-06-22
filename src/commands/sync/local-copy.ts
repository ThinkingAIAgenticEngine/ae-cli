import {
  cpSync,
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import {
  readSkillManifestEntries,
  SKILL_MANIFEST_FILE,
  writeSkillManifestEntries,
  type SkillManifestEntry,
} from './skill-manifest.js';

const SKILL_SLUG_RE = /^[a-z0-9-]+$/;

export interface CopySkillPackageResult {
  targetDir: string;
  skipped: boolean;
}

export interface UpdateSkillManifestResult {
  manifestPath: string;
  changed: boolean;
}

export function updateSkillManifestForSource(
  sourceDir: string,
  slug: string,
): UpdateSkillManifestResult {
  if (!SKILL_SLUG_RE.test(slug)) {
    throw new Error(`Invalid Skill slug: ${slug}`);
  }

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

export function copySkillPackageToTarget(args: {
  sourceDir: string;
  targetRoot: string;
  slug: string;
}): CopySkillPackageResult {
  if (!SKILL_SLUG_RE.test(args.slug)) {
    throw new Error(`Invalid Skill slug: ${args.slug}`);
  }
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
