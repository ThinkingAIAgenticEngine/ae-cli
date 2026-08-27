import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { getConfigDir } from '../../core/config.js';

/**
 * Handoff packages live under a `.ae-cli/data-integration/` directory. Reuse looks
 * them up from the current working directory upward, then falls back to a
 * per-user global directory, so a package written in one project is reachable
 * from anywhere the user starts Claude Code / Codex.
 */

/** Per-user global fallback: `~/.ae-cli/data-integration/`. `undefined` without a HOME. */
export function globalHandoffDir(): string | undefined {
  const home = process.env.HOME;
  if (!home) return undefined;
  return join(getConfigDir(), 'data-integration');
}

/**
 * Candidate `.ae-cli/data-integration/` directories from `startDir` upward to the
 * filesystem root, in search order (nearest first, deduplicated).
 */
export function upwardHandoffDirs(startDir: string): string[] {
  const dirs: string[] = [];
  let current = resolve(startDir);
  for (;;) {
    const candidate = join(current, '.ae-cli', 'data-integration');
    if (!dirs.includes(candidate)) dirs.push(candidate);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

/** All directories reuse searches, in order: upward chain, then the global fallback. */
export function reuseSearchPaths(startDir: string = process.cwd()): string[] {
  const globalDir = globalHandoffDir();
  return globalDir ? [...upwardHandoffDirs(startDir), globalDir] : upwardHandoffDirs(startDir);
}

/**
 * Resolve the handoff root reuse should probe. Returns the nearest existing
 * `.ae-cli/data-integration/` on the upward chain, else the global fallback (which
 * may not exist yet — `detectReuse` treats a missing index as "no match").
 */
export function findReuseRoot(startDir: string = process.cwd()): string | undefined {
  for (const dir of upwardHandoffDirs(startDir)) {
    if (existsSync(join(dir, 'index.json'))) return dir;
  }
  return globalHandoffDir();
}
