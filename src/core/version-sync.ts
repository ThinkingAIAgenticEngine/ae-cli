import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getConfigDir } from './config.js';
import {
  AE_CLI_SKILLS_REPO,
  normalizeCliVersion,
  OPEN_SOURCE_AE_CLI_PACKAGE,
  versionLine,
} from './version-compat.js';
import { normalizeUrl } from './url-utils.js';

const COMMAND_TIMEOUT_MS = 120_000;
const AUTO_ATTEMPT_INTERVAL_MS = 60 * 60 * 1000;
const MAX_AUTO_ATTEMPTS_PER_DAY = 3;
const LOCK_STALE_MS = 10 * 60 * 1000;
const SYNC_STATE_FILE = 'version-sync.json';
const SYNC_LOCK_FILE = 'version-sync.lock';

export type VersionSyncStage =
  | 'lock'
  | 'npm_install'
  | 'package_validation'
  | 'skills_local'
  | 'skills_github';

export type VersionSyncFailureCause =
  | 'busy'
  | 'network'
  | 'permission'
  | 'timeout'
  | 'package_missing'
  | 'validation'
  | 'unknown';

export interface ProcessResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
  signal?: NodeJS.Signals | null;
}

export type ProcessRunner = (
  command: string,
  args: string[],
  timeoutMs: number,
) => ProcessResult;

export interface VersionInstallOptions {
  skipCliInstall?: boolean;
  progress?: (message: string) => void;
  runner?: ProcessRunner;
  now?: Date;
}

export type VersionInstallResult =
  | {
      ok: true;
      cliInstalled: boolean;
      skillsSource: 'local' | 'github';
    }
  | {
      ok: false;
      stage: VersionSyncStage;
      cliInstalled: boolean;
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

export function isAutoSyncTargetEligible(version: string): boolean {
  const normalized = normalizeCliVersion(version);
  const parts = normalized.split('-')[0].split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) return false;
  const [major, minor, patch] = parts;
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

export function resolveNodeTool(
  tool: 'npm' | 'npx',
  execPath: string = process.execPath,
  platform: NodeJS.Platform = process.platform,
): string {
  const fileName = platform === 'win32' ? `${tool}.cmd` : tool;
  const sibling = path.join(path.dirname(execPath), fileName);
  return fs.existsSync(sibling) ? sibling : fileName;
}

export function buildVersionInstallPlan(targetRaw: string, globalRoot = '<npm-root>'): {
  target: string;
  commands: string[];
  skillsSources: Array<'installed-package' | 'github-fallback'>;
} {
  const target = normalizeCliVersion(targetRaw);
  const localSkills = path.join(globalRoot, '@thinkingai', 'ae-cli', 'skills');
  return {
    target,
    commands: [
      `npm install -g ${OPEN_SOURCE_AE_CLI_PACKAGE}@${target}`,
      `npx -y skills add ${localSkills} -g -y`,
      `npx -y skills add ${AE_CLI_SKILLS_REPO}#v${target} -g -y`,
    ],
    skillsSources: ['installed-package', 'github-fallback'],
  };
}

function defaultRunner(command: string, args: string[], timeoutMs: number): ProcessResult {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
    signal: result.signal,
  };
}

function resultMessage(result: ProcessResult): string {
  if (result.error?.message) return result.error.message;
  const detail = (result.stderr || result.stdout).trim().split(/\r?\n/).filter(Boolean).slice(-3).join(' ');
  if (detail) return detail;
  if (result.signal) return `Command terminated by ${result.signal}`;
  return `Command exited with status ${result.status ?? 'unknown'}`;
}

function classifyFailure(result: ProcessResult): VersionSyncFailureCause {
  const text = `${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`;
  if (result.error && (result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') return 'timeout';
  if (/timed?\s*out|ETIMEDOUT/i.test(text)) return 'timeout';
  if (/EACCES|EPERM|permission denied|access is denied/i.test(text)) return 'permission';
  if (
    /EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|network|unable to access|could not resolve|certificate|SSL/i.test(text)
  ) {
    return 'network';
  }
  if (/E404|404 Not Found|no matching version|couldn't find remote ref|not found/i.test(text)) {
    return 'package_missing';
  }
  return 'unknown';
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

function commandSucceeded(result: ProcessResult): boolean {
  return !result.error && result.status === 0;
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

function validateInstalledPackage(
  npm: string,
  target: string,
  runner: ProcessRunner,
): { ok: true; skillsPath: string } | { ok: false; message: string } {
  const rootResult = runner(npm, ['root', '-g'], COMMAND_TIMEOUT_MS);
  if (!commandSucceeded(rootResult)) {
    return { ok: false, message: resultMessage(rootResult) };
  }

  const globalRoot = rootResult.stdout.trim();
  const packageRoot = path.join(globalRoot, '@thinkingai', 'ae-cli');
  const packageJson = path.join(packageRoot, 'package.json');
  const skillsPath = path.join(packageRoot, 'skills');
  try {
    const installed = JSON.parse(fs.readFileSync(packageJson, 'utf8')) as { version?: string };
    if (normalizeCliVersion(installed.version || '') !== target) {
      return {
        ok: false,
        message: `Installed package version ${installed.version || 'unknown'} does not match ${target}`,
      };
    }
    if (!fs.statSync(skillsPath).isDirectory()) {
      return { ok: false, message: `Installed package has no skills directory: ${skillsPath}` };
    }
    return { ok: true, skillsPath };
  } catch (error: any) {
    return { ok: false, message: error?.message || String(error) };
  }
}

export function installVersion(
  targetRaw: string,
  options: VersionInstallOptions = {},
): VersionInstallResult {
  const target = normalizeCliVersion(targetRaw);
  const runner = options.runner ?? defaultRunner;
  const progress = options.progress ?? (() => {});
  const npm = resolveNodeTool('npm');
  const npx = resolveNodeTool('npx');
  const lock = acquireInstallLock(options.now ?? new Date());
  if (lock === null) {
    return {
      ok: false,
      stage: 'lock',
      cliInstalled: false,
      skillsPending: Boolean(options.skipCliInstall),
      cause: 'busy',
      message: 'Another ae-cli process is already synchronizing the global installation.',
    };
  }

  let cliInstalled = Boolean(options.skipCliInstall);
  try {
    if (!options.skipCliInstall) {
      progress(`[ae-cli] [1/2] Installing ae-cli ${target}...`);
      const npmResult = runner(
        npm,
        ['install', '-g', `${OPEN_SOURCE_AE_CLI_PACKAGE}@${target}`],
        COMMAND_TIMEOUT_MS,
      );
      if (!commandSucceeded(npmResult)) {
        return {
          ok: false,
          stage: 'npm_install',
          cliInstalled: false,
          skillsPending: false,
          cause: classifyFailure(npmResult),
          message: resultMessage(npmResult),
        };
      }
      cliInstalled = true;
    }

    const installed = validateInstalledPackage(npm, target, runner);
    if (!installed.ok) {
      return {
        ok: false,
        stage: 'package_validation',
        cliInstalled,
        skillsPending: cliInstalled,
        cause: 'validation',
        message: installed.message,
      };
    }

    progress('[ae-cli] [2/2] Synchronizing Skills from the installed npm package...');
    const localResult = runner(
      npx,
      ['-y', 'skills', 'add', installed.skillsPath, '-g', '-y'],
      COMMAND_TIMEOUT_MS,
    );
    if (commandSucceeded(localResult)) {
      return { ok: true, cliInstalled, skillsSource: 'local' };
    }

    progress('[ae-cli] Local Skills sync did not complete; trying the GitHub fallback...');
    const githubResult = runner(
      npx,
      ['-y', 'skills', 'add', `${AE_CLI_SKILLS_REPO}#v${target}`, '-g', '-y'],
      COMMAND_TIMEOUT_MS,
    );
    if (commandSucceeded(githubResult)) {
      return { ok: true, cliInstalled, skillsSource: 'github' };
    }

    return {
      ok: false,
      stage: 'skills_github',
      cliInstalled,
      skillsPending: cliInstalled,
      cause: classifyFailure(githubResult),
      message: resultMessage(githubResult) || resultMessage(localResult),
    };
  } finally {
    releaseInstallLock(lock);
  }
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
