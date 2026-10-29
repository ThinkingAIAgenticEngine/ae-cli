import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getActiveHost, getConfigDir } from './config.js';
import { peekCliToken } from './cli-token.js';
import { fetchCliConfig, type CliConfigResult } from './compat-check.js';
import { rememberBusinessConfig } from './business-config.js';
import type { BusinessStates } from './businesses.js';
import { getLocalCliPackageInfo } from './package-info.js';
import { canManageGlobalSkills } from './local-skill-context.js';
import { normalizeUrl } from './url-utils.js';
import { isBusinessSkillContextCurrent, reserveBusinessSkillContext, syncBusinessSkills } from './business-skill-sync.js';

export interface EnvironmentRefreshResult {
  host: string;
  businesses: BusinessStates;
  source: 'remote' | 'unavailable';
  skills: ReturnType<typeof syncBusinessSkills> | { status: 'skipped' | 'failed'; reason: string };
}

export interface EnvironmentRefreshOptions {
  synchronizeSkills?: boolean;
  fetchConfig?: typeof fetchCliConfig;
}

export function cliTokenFingerprint(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Invalidate workers before persisting a local host or credential transition. */
export function invalidateBusinessSkillSynchronization(): void {
  if (canManageGlobalSkills()) reserveBusinessSkillContext({});
}

/** Refresh discovery after an explicit local login or environment selection. */
export async function refreshEnvironmentConfig(
  host: string,
  options: EnvironmentRefreshOptions = {},
): Promise<EnvironmentRefreshResult> {
  const normalized = normalizeUrl(host);
  const skipped = (reason: string): EnvironmentRefreshResult => ({
    host: normalized, businesses: {}, source: 'unavailable', skills: { status: 'skipped', reason },
  });
  let token: string | null | undefined;
  try { token = peekCliToken(normalized); }
  catch { return skipped('Credentials could not be read. Sign in before refreshing Skills.'); }
  if (!token) return skipped('Sign in to this environment before refreshing its business configuration.');

  const fingerprint = cliTokenFingerprint(token);
  const localActiveEnvironment = (): boolean => {
    try {
      return canManageGlobalSkills()
        && normalizeUrl(getActiveHost()) === normalized
        && cliTokenFingerprint(peekCliToken(normalized) ?? '') === fingerprint;
    } catch { return false; }
  };
  const synchronize = options.synchronizeSkills !== false && localActiveEnvironment();
  // Reserve before the network request: a newer environment must supersede slow responses.
  const generation = synchronize
    ? reserveBusinessSkillContext({ host: normalized, tokenFingerprint: fingerprint })
    : undefined;
  let config: CliConfigResult | null;
  try { config = await (options.fetchConfig ?? fetchCliConfig)(normalized, token); }
  catch { config = null; }
  if (!config) return skipped('CLI configuration is unavailable; existing Skills were preserved.');
  if (generation && !isBusinessSkillContextCurrent({
    host: normalized, tokenFingerprint: fingerprint, generation, isCurrentContext: localActiveEnvironment,
  })) {
    return { host: normalized, businesses: {}, source: 'remote',
      skills: { status: 'skipped', reason: 'A newer environment refresh superseded this response.' } };
  }
  rememberBusinessConfig(normalized, token, config.businesses);
  const result: EnvironmentRefreshResult = {
    host: normalized,
    businesses: config.businesses ?? {},
    source: 'remote',
    skills: { status: 'skipped', reason: 'Only an explicitly refreshed active local environment changes global Skills.' },
  };
  if (config.businesses === undefined) {
    result.skills = { status: 'skipped', reason: 'This server does not provide business states; existing Skills were preserved.' };
    return result;
  }
  if (!synchronize || !localActiveEnvironment()) return result;
  try {
    const syncOptions = {
      skillsDirectory: path.join(getLocalCliPackageInfo().root, 'skills'),
      host: normalized,
      tokenFingerprint: fingerprint,
      businesses: config.businesses,
      packageVersion: getLocalCliPackageInfo().version,
      generation,
      isCurrentContext: localActiveEnvironment,
    };
    // Adopt legacy copies once, and only when they exactly match this package.
    if (!fs.existsSync(path.join(getConfigDir(), 'business-skills.json'))) {
      const adoption = syncBusinessSkills({ ...syncOptions, mode: 'adopt' });
      if (['failed', 'busy', 'stale'].includes(adoption.status)) {
        result.skills = adoption;
        return result;
      }
    }
    result.skills = syncBusinessSkills(syncOptions);
  } catch {
    result.skills = { status: 'failed', reason: 'Skill synchronization could not complete. Retry: ae-cli config refresh' };
  }
  return result;
}

/** Authentication remains successful even if optional config or Skill synchronization fails. */
export async function refreshEnvironmentAfterLogin(host: string): Promise<EnvironmentRefreshResult | undefined> {
  try {
    const result = await refreshEnvironmentConfig(host);
    if (!['success', 'skipped'].includes(result.skills.status)) {
      process.stderr.write('[ae-cli] Some Skills could not be synchronized. Run: ae-cli config refresh\n');
    }
    if (result.source === 'unavailable') {
      process.stderr.write('[ae-cli] Business configuration could not be refreshed. Sign in if needed, then run: ae-cli config refresh\n');
    }
    return result;
  } catch {
    process.stderr.write('[ae-cli] Business configuration could not be refreshed. Retry: ae-cli config refresh\n');
    return undefined;
  }
}
