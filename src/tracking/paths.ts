import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfigDir } from '../core/config.js';

/** Project-local tracking workspace: ./.ae-cli/ */
export function getProjectDir(cwd = process.cwd()): string {
  return join(cwd, '.ae-cli');
}

/** Global ae-cli config dir: ~/.ae-cli/ */
export { getConfigDir };

export function getWikiSymlinkDir(): string {
  return join(getConfigDir(), 'wiki');
}

const AE_CLI_PACKAGE_NAMES = new Set(['@tant/ae-cli', '@thinkingai/ae-cli']);

export function isAeCliPackageName(name: unknown): name is string {
  return typeof name === 'string' && (AE_CLI_PACKAGE_NAMES.has(name) || name.endsWith('/ae-cli'));
}

export function getPackageRoot(): string {
  let cur = dirname(fileURLToPath(import.meta.url));
  while (cur !== dirname(cur)) {
    const pj = join(cur, 'package.json');
    if (existsSync(pj)) {
      try {
        const pkg = JSON.parse(readFileSync(pj, 'utf8'));
        if (isAeCliPackageName(pkg.name)) return cur;
      } catch {
        /* keep walking */
      }
    }
    cur = dirname(cur);
  }
  throw new Error('Could not locate ae-cli package root');
}
