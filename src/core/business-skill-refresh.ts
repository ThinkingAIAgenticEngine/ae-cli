import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getActiveHost, getConfigDir } from './config.js';
import { peekCliToken } from './cli-token.js';
import { normalizeBusinesses } from './businesses.js';
import { canManageGlobalSkills } from './local-skill-context.js';
import { getLocalCliPackageInfo } from './package-info.js';
import { normalizeUrl } from './url-utils.js';
import { isBusinessSkillContextCurrent, reserveBusinessSkillContext, syncBusinessSkills } from './business-skill-sync.js';

export interface BusinessSkillRefresh {
  host: string;
  tokenFingerprint: string;
  generation: string;
  isCurrentContext: () => boolean;
}

/** Reserve before fetching so a slower response cannot undo a newer business snapshot. */
export function beginBusinessSkillRefresh(host: string, token: string, enabled = true): BusinessSkillRefresh | undefined {
  try {
    if (!enabled) return undefined;
    const normalized = normalizeUrl(host);
    const isCurrentContext = (): boolean => {
      try {
        return canManageGlobalSkills() && normalizeUrl(getActiveHost()) === normalized && peekCliToken(normalized) === token;
      } catch { return false; }
    };
    if (!isCurrentContext()) return undefined;
    const identity = { host: normalized, tokenFingerprint: crypto.createHash('sha256').update(token).digest('hex') };
    return { ...identity, generation: reserveBusinessSkillContext(identity), isCurrentContext };
  } catch { return undefined; }
}

export function isBusinessSkillRefreshCurrent(refresh: BusinessSkillRefresh | undefined): boolean {
  return !refresh || isBusinessSkillContextCurrent(refresh);
}

/** Optional local maintenance cannot change the business request's output or success. */
export function syncRefreshedBusinessSkills(refresh: BusinessSkillRefresh | undefined, businesses: unknown): void {
  if (!refresh || !isBusinessSkillRefreshCurrent(refresh)) return;
  const states = normalizeBusinesses(businesses);
  if (!Object.keys(states).length) return;
  try {
    const pkg = getLocalCliPackageInfo();
    const options = { ...refresh, skillsDirectory: path.join(pkg.root, 'skills'), businesses: states, packageVersion: pkg.version };
    if (!fs.existsSync(path.join(getConfigDir(), 'business-skills.json'))) {
      const adoption = syncBusinessSkills({ ...options, mode: 'adopt' });
      if (['failed', 'busy', 'stale'].includes(adoption.status)) {
        if (adoption.status !== 'stale') process.stderr.write('[ae-cli] Skills could not be synchronized. Retry: ae-cli config refresh\n');
        return;
      }
    }
    const result = syncBusinessSkills({ ...options, onlyIfChanged: true });
    if (!['success', 'stale'].includes(result.status)) {
      process.stderr.write('[ae-cli] Some Skills could not be synchronized. Retry: ae-cli config refresh\n');
    }
  } catch {
    process.stderr.write('[ae-cli] Skills could not be synchronized. Retry: ae-cli config refresh\n');
  }
}
