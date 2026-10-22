import fs from 'node:fs';
import path from 'node:path';
import { getConfigDir } from './config.js';
import {
  normalizeCliVersion,
  OPEN_SOURCE_AE_CLI_PACKAGE,
  versionLine,
} from './version-compat.js';
import { normalizeUrl } from './url-utils.js';

import { runInstallation, installPlan, type InstallationOptions, type InstallationReport } from './installation.js';
export { resolveNodeTool } from './install-process.js';
export type { ProcessResult, ProcessRunner } from './install-process.js';
const AUTO_ATTEMPT_INTERVAL_MS = 60 * 60 * 1000;
const MAX_AUTO_ATTEMPTS_PER_DAY = 3;
const LOCK_STALE_MS = 10 * 60 * 1000;
const SYNC_STATE_FILE = 'version-sync.json';
const SYNC_LOCK_FILE = 'version-sync.lock';

export type VersionSyncStage =
  | 'environment'
  | 'lock'
  | 'npm_install'
  | 'package_validation'
  | 'skills_local'
  | 'skills_github'
  | 'skills_clients';

export type VersionSyncFailureCause =
  | 'busy'
  | 'network'
  | 'permission'
  | 'timeout'
  | 'package_missing'
  | 'validation'
  | 'unknown';

export interface VersionInstallOptions extends InstallationOptions {
  now?: Date;
}

export type VersionInstallResult =
  | {
      ok: true;
      cliInstalled: boolean;
      report?: InstallationReport;
      skillsSource: 'local' | 'github';
    }
  | {
      ok: false;
      stage: VersionSyncStage;
      cliInstalled: boolean;
      report?: InstallationReport;
      skillsPending: boolean;
      cause: VersionSyncFailureCause;
      message: string;
    };

interface HostSyncState {
  target: string;
  attemptDay: string;
  attemptsToday: number;
  lastAttemptAt?: string;
  pendingSkills?: boolean;
  lastFailureStage?: VersionSyncStage;
}

interface VersionSyncStore {
  hosts: Record<string, HostSyncState>;
}

export interface AutoAttemptDecision {
  allowed: boolean;
  reason?: 'hourly_limit' | 'daily_limit';
  entry: HostSyncState;
}

function syncStatePath(): string {
  return path.join(getConfigDir(), SYNC_STATE_FILE);
}

function syncLockPath(): string {
  return path.join(getConfigDir(), SYNC_LOCK_FILE);
}

function readSyncStore(): VersionSyncStore {
  try {
    const raw = JSON.parse(fs.readFileSync(syncStatePath(), 'utf8')) as VersionSyncStore;
    if (raw && typeof raw === 'object' && raw.hosts && typeof raw.hosts === 'object') {
      return raw;
    }
  } catch {
    // Missing or malformed state starts clean.
  }
  return { hosts: {} };
}

function writeSyncStore(store: VersionSyncStore): void {
  try {
    fs.mkdirSync(getConfigDir(), { recursive: true });
    fs.writeFileSync(syncStatePath(), JSON.stringify(store, null, 2));
  } catch {
    // Version synchronization must not make normal commands unusable.
  }
}

function localDay(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function freshAttemptEntry(target: string, now: Date): HostSyncState {
  return {
    target,
    attemptDay: localDay(now),
    attemptsToday: 0,
  };
}

export function evaluateAutoAttempt(
  existing: HostSyncState | undefined,
  target: string,
  now: Date = new Date(),
): AutoAttemptDecision {
  const today = localDay(now);
  const entry =
    !existing || existing.target !== target || existing.attemptDay !== today
      ? freshAttemptEntry(target, now)
      : { ...existing };

  if (entry.attemptsToday >= MAX_AUTO_ATTEMPTS_PER_DAY) {
    return { allowed: false, reason: 'daily_limit', entry };
  }
  if (entry.lastAttemptAt) {
    const elapsed = now.getTime() - new Date(entry.lastAttemptAt).getTime();
    if (Number.isFinite(elapsed) && elapsed < AUTO_ATTEMPT_INTERVAL_MS) {
      return { allowed: false, reason: 'hourly_limit', entry };
    }
  }
  return { allowed: true, entry };
}

export function reserveAutoAttempt(
  host: string,
  target: string,
  now: Date = new Date(),
): AutoAttemptDecision {
  const store = readSyncStore();
  const key = normalizeUrl(host);
  const decision = evaluateAutoAttempt(store.hosts[key], target, now);
  if (!decision.allowed) return decision;

  decision.entry.attemptsToday += 1;
  decision.entry.lastAttemptAt = now.toISOString();
  store.hosts[key] = decision.entry;
  writeSyncStore(store);
  return decision;
}

export function getPendingSkillsTarget(host: string): string | undefined {
  const entry = readSyncStore().hosts[normalizeUrl(host)];
  return entry?.pendingSkills ? entry.target : undefined;
}

export function recordVersionSyncResult(
  host: string,
  target: string,
  result: VersionInstallResult,
): void {
  const store = readSyncStore();
  const key = normalizeUrl(host);
  const existing = store.hosts[key] ?? freshAttemptEntry(target, new Date());
  const entry =
    existing.target === target
      ? existing
      : freshAttemptEntry(target, new Date());

  if (result.ok) {
    entry.pendingSkills = false;
    delete entry.lastFailureStage;
  } else {
    entry.pendingSkills = result.skillsPending;
    entry.lastFailureStage = result.stage;
  }
  store.hosts[key] = entry;
  writeSyncStore(store);
}

/** Automatic replacement only applies to stable, three-component release versions. */
export function isRegularCliVersion(version: string): boolean {
  const normalized = normalizeCliVersion(version);
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(normalized)
    && normalized.split('.').every((part) => Number.isSafeInteger(Number(part)));
}

export function isAutoSyncTargetEligible(version: string): boolean {
  if (!isRegularCliVersion(version)) return false;
  const [major, minor, patch] = normalizeCliVersion(version).split('.').map(Number);
  if (major > 6) return true;
  if (major !== 6) return false;
  if (minor > 1) return true;
  if (minor === 1) return patch >= 5;
  if (minor === 0) return patch >= 33;
  return false;
}

export function isPublicAeCliPackage(packageName: string): boolean {
  return packageName === OPEN_SOURCE_AE_CLI_PACKAGE;
}

export function buildVersionInstallPlan(targetRaw: string, globalRoot = '<npm-root>', packageName = OPEN_SOURCE_AE_CLI_PACKAGE): {
  target: string;
  commands: string[];
  skillsSources: Array<'installed-package' | 'github-fallback'>;
} {
  const target = normalizeCliVersion(targetRaw);
  return { target, commands: installPlan(packageName, target, globalRoot), skillsSources: ['installed-package', 'github-fallback'] };
}

export function friendlyVersionSyncFailure(
  result: Extract<VersionInstallResult, { ok: false }>,
): string {
  if (result.cause === 'busy') {
    return 'Another ae-cli process is synchronizing the global installation.';
  }
  if (result.cause === 'permission') {
    return 'The global npm installation directory is not writable.';
  }
  if (result.cause === 'timeout') {
    return 'The npm or Skills download timed out.';
  }
  if (result.cause === 'network') {
    return 'The npm registry or Skills source could not be reached.';
  }
  if (result.cause === 'package_missing') {
    return 'The required CLI package or Skills tag is not available.';
  }
  if (result.cause === 'validation') {
    return 'The installed package could not be validated.';
  }
  return `Version synchronization failed at ${result.stage}.`;
}

function acquireInstallLock(now: Date): number | null {
  fs.mkdirSync(getConfigDir(), { recursive: true });
  const file = syncLockPath();
  try {
    return fs.openSync(file, 'wx');
  } catch {
    try {
      const age = now.getTime() - fs.statSync(file).mtimeMs;
      if (age >= LOCK_STALE_MS) {
        fs.unlinkSync(file);
        return fs.openSync(file, 'wx');
      }
    } catch {
      // Another process may have released the lock between checks.
      try {
        return fs.openSync(file, 'wx');
      } catch {
        return null;
      }
    }
    return null;
  }
}

function releaseInstallLock(fd: number): void {
  try {
    fs.closeSync(fd);
  } catch {}
  try {
    fs.unlinkSync(syncLockPath());
  } catch {}
}

export function installVersion(targetRaw: string, options: VersionInstallOptions = {}): VersionInstallResult {
  const run = (): VersionInstallResult => {
    const report = runInstallation({ ...options, target: targetRaw });
    const cliInstalled = report.cli.verified || report.cli.action === 'installed';
    if (report.ok) return { ok: true, cliInstalled, skillsSource: report.skills.source === 'installed-package' ? 'local' : 'github', report };
    return { ok: false, stage: report.error?.stage as VersionSyncStage ?? 'environment', cliInstalled,
      skillsPending: cliInstalled, cause: report.error?.cause as VersionSyncFailureCause ?? 'validation',
      message: report.error?.message ?? 'Installation failed.', report };
  };
  if (options.dryRun) return run();
  let lock: number | null;
  try { lock = acquireInstallLock(options.now ?? new Date()); }
  catch {
    return { ok: false, stage: 'lock', cliInstalled: false, skillsPending: Boolean(options.skipCliInstall),
      cause: 'permission', message: 'The installation lock directory is not writable.' };
  }
  if (lock === null) return { ok: false, stage: 'lock', cliInstalled: false,
    skillsPending: Boolean(options.skipCliInstall), cause: 'busy',
    message: 'Another ae-cli process is already synchronizing the global installation.' };
  try { return run(); } finally { releaseInstallLock(lock); }
}

export function autoSyncDirection(current: string, expected: string): 'upgrade' | 'downgrade' | 'switch' {
  if (versionLine(current) !== versionLine(expected)) return 'switch';
  const currentParts = normalizeCliVersion(current).split('-')[0].split('.').map(Number);
  const expectedParts = normalizeCliVersion(expected).split('-')[0].split('.').map(Number);
  for (let i = 0; i < Math.max(currentParts.length, expectedParts.length, 3); i += 1) {
    const local = currentParts[i] ?? 0;
    const target = expectedParts[i] ?? 0;
    if (local < target) return 'upgrade';
    if (local > target) return 'downgrade';
  }
  return 'switch';
}
