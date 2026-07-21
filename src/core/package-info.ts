import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolve local ae-cli package.json after tsup split-chunk bundling. */
export function getLocalCliPackageInfo(): { name: string; version: string } {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, 'package.json');
    try {
      if (fs.existsSync(candidate)) {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8')) as {
          name?: string;
          version?: string;
        };
        if (pkg.name && pkg.version && String(pkg.name).includes('ae-cli')) {
          return { name: pkg.name, version: pkg.version };
        }
      }
    } catch {
      // continue walking up
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return { name: '@tant/ae-cli', version: '0.0.0' };
}
