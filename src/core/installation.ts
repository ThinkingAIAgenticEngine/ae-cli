import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getLocalCliPackageInfo } from './package-info.js';
import { globalSkillsDirectory, readBundledSkills, verifyGlobalSkills, type SkillFailure } from './skills-install.js';
import { getActiveHost, getConfigDir } from './config.js';
import { peekCliToken } from './cli-token.js';
import { readBusinessConfig } from './business-config.js';
import { canManageGlobalSkills } from './local-skill-context.js';
import { OPTIONAL_BUSINESSES, getSkillBusinessState, type BusinessStates } from './businesses.js';
import { isBusinessSkillContextCurrent, reserveBusinessSkillContext, syncBusinessSkills, type BusinessSkillSyncReport } from './business-skill-sync.js';
import {
  commandSucceeded, classifyInstallFailure, defaultInstallRunner, exactVersion, installHost,
  resolveNodeTool, INSTALL_TIMEOUT_MS, type ProcessRunner,
} from './install-process.js';

export interface InstallationReport {
  ok: boolean;
  dry_run: boolean;
  cli: { package: string; version: string; path: string | null; entrypoint: string | null; verified: boolean; action: 'pending' | 'installed' | 'skipped'; warnings: string[] };
  skills: {
    directory: string; expected_count: number; installed_count: number; missing: string[];
    source: string | null; version: string;
    status: 'pending' | 'success' | 'partial' | 'failed' | 'skipped';
    failures: SkillFailure[];
    attempts: Array<{ source: string; stage: string; cause: string | null; failures: SkillFailure[] }>;
    synchronization?: BusinessSkillSyncReport;
  };
  auth: { host: string | null; authenticated: boolean | null; warnings: string[] };
  next_steps: string[];
  commands?: string[];
  error?: { type: 'config'; code: string; message: string; stage: string; cause: string };
}

export interface InstallationOptions {
  target?: string;
  packageName?: string;
  host?: string;
  dryRun?: boolean;
  skipCliInstall?: boolean;
  runner?: ProcessRunner;
  progress?: (message: string) => void;
  nodeVersion?: string;
  platform?: NodeJS.Platform;
  skillsDirectory?: string;
  env?: NodeJS.ProcessEnv;
  /** Explicit snapshot injection; an empty object keeps optional businesses unknown. */
  businesses?: BusinessStates;
  syncSkills?: typeof syncBusinessSkills;
  skillStateDirectory?: string;
  skillContext?: { host: string; tokenFingerprint: string; isCurrentContext?: () => boolean };
}

export function distribution(packageName: string): { registry: string; repository: string } {
  if (packageName === '@thinkingai/ae-cli') return { registry: 'https://registry.npmjs.org', repository: 'ThinkingAIAgenticEngine/ae-cli' };
  if (packageName === '@tant/ae-cli') return { registry: 'https://npm.thinkingdata.cn:3443', repository: 'http://10.27.249.150:8888/te-ai/te-cli.git' };
  throw new Error('Unsupported CLI package. Use an official AE CLI distribution.');
}

export function newInstallationReport(packageName: string, version: string, dryRun = false): InstallationReport {
  return {
    ok: false, dry_run: dryRun,
    cli: { package: packageName, version, path: null, entrypoint: null, verified: false, action: 'pending', warnings: [] },
    skills: { directory: globalSkillsDirectory(), expected_count: 0, installed_count: 0, missing: [], source: null,
      version, status: 'pending', failures: [], attempts: [] },
    auth: { host: null, authenticated: null, warnings: [] }, next_steps: [],
  };
}

export function failInstallation(report: InstallationReport, stage: string, message: string, cause = 'validation'): InstallationReport {
  report.ok = false;
  report.error = { type: 'config', code: 'AE_CLI_INSTALL_FAILED', message, stage, cause };
  if (!report.next_steps.length) report.next_steps.push('Fix the reported problem and rerun the same install or update command.');
  return report;
}

export function installPlan(packageName: string, version: string, root = '<npm-root>'): string[] {
  const config = distribution(packageName);
  const target = exactVersion(version);
  const executable = path.join(root, packageName, 'bin', 'ae-cli.js');
  return [
    `npm install -g ${packageName}@${target} --registry=${config.registry}`,
    `node ${JSON.stringify(executable)} install`,
  ];
}

function currentSkillIdentity(): { host: string; tokenFingerprint: string } {
  const host = getActiveHost();
  const token = host ? peekCliToken(host) : undefined;
  return { host, tokenFingerprint: token ? crypto.createHash('sha256').update(token).digest('hex') : '' };
}

function skipGlobalSkillReason(): string | undefined {
  try {
    if (canManageGlobalSkills()) return undefined;
  } catch {
    // Invalid injected credentials cannot grant ownership over the host's Skills.
  }
  return 'An external-token or AE sandbox execution context is selected; global Skills were left unchanged.';
}

function readPackage(root: string): { name?: string; version?: string } | null {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); }
  catch { return null; }
}

function linked(root: string): boolean {
  try { return fs.lstatSync(root).isSymbolicLink(); } catch { return false; }
}

function cliBinBelongsToPackage(bin: string, packageRoot: string, platform: NodeJS.Platform): boolean {
  const entry = fs.realpathSync(path.join(packageRoot, 'bin', 'ae-cli.js'));
  if (platform !== 'win32') return fs.realpathSync(bin) === entry;
  // npm creates a command shim on Windows, not a symlink to the JavaScript entry.
  // Accept the current %dp0% and historical %~dp0 forms emitted by npm.
  const shim = fs.readFileSync(bin, 'utf8');
  const targets = [...shim.matchAll(/"%(?:dp0%|~dp0)[\\/]([^"\r\n]+)"/gi)];
  return targets.some(([, relative]) => {
    try {
      const target = path.resolve(path.dirname(bin), relative.replace(/\\/g, path.sep));
      return fs.realpathSync(target).toLowerCase() === entry.toLowerCase();
    } catch { return false; }
  });
}

export function runInstallation(options: InstallationOptions = {}): InstallationReport {
  const local = getLocalCliPackageInfo();
  const packageName = options.packageName ?? local.name;
  const report = newInstallationReport(packageName, '', Boolean(options.dryRun));
  const runner = options.runner ?? defaultInstallRunner;
  const progress = options.progress ?? (() => {});
  const platform = options.platform ?? process.platform;
  report.skills.directory = options.skillsDirectory ?? globalSkillsDirectory();
  let stage = 'environment';
  try {
    const target = exactVersion(options.target ?? local.version);
    report.cli.version = target;
    report.skills.version = target;
    const config = distribution(packageName);
    report.auth.host = installHost(options.host);
    const major = Number((options.nodeVersion ?? process.versions.node).split('.')[0]);
    if (!Number.isInteger(major) || major < 20) return failInstallation(report, stage, 'AE CLI requires Node.js 20 or later. Select an existing supported Node runtime and rerun.');
    if (options.dryRun) {
      report.ok = true;
      report.commands = installPlan(packageName, target);
      report.next_steps.push('Dry run only; CLI, global Skills, and authentication have not been verified.');
      return report;
    }
    const npm = resolveNodeTool('npm', process.execPath, platform);
    progress('[ae-cli] [1/4] Checking Node.js, npm, and npx...');
    for (const tool of [npm, resolveNodeTool('npx', process.execPath, platform)]) {
      const result = runner(tool, ['--version'], 15_000);
      if (!commandSucceeded(result)) return failInstallation(report, stage, 'npm and npx must be available alongside the selected Node.js runtime.', classifyInstallFailure(result));
    }

    stage = 'package_validation';
    const rootResult = runner(npm, ['root', '-g'], 15_000);
    const prefixResult = runner(npm, ['prefix', '-g'], 15_000);
    const globalRoot = rootResult.stdout.trim();
    const prefix = prefixResult.stdout.trim();
    if (!commandSucceeded(rootResult) || !commandSucceeded(prefixResult) || !path.isAbsolute(globalRoot) || !path.isAbsolute(prefix)
      || /[\r\n]/.test(globalRoot + prefix)) return failInstallation(report, stage, 'Cannot resolve npm global root and prefix. Check npm configuration.');
    const packageRoot = path.join(globalRoot, packageName);
    const bin = platform === 'win32' ? path.join(prefix, 'ae-cli.cmd') : path.join(prefix, 'bin', 'ae-cli');
    report.cli.path = bin;
    const env = options.env ?? process.env;
    const installedBefore = readPackage(packageRoot);
    if (linked(packageRoot) && !options.skipCliInstall) return failInstallation(report, stage, 'The global CLI is npm-linked to source. Preserve the link; use a separate npm prefix for a packaged installation.');
    const syncSkills = options.syncSkills ?? syncBusinessSkills;
    const skipSkills = skipGlobalSkillReason();
    let context: { host: string; tokenFingerprint: string; stateDirectory: string; generation: string; isCurrentContext: () => boolean } | undefined;
    if (!skipSkills) {
      const stateDirectory = options.skillStateDirectory ?? getConfigDir();
      const identity = options.skillContext ?? currentSkillIdentity();
      const isCurrentContext = (): boolean => {
        if (skipGlobalSkillReason()) return false;
        if (options.skillContext) return options.skillContext.isCurrentContext?.() ?? true;
        try {
          const current = currentSkillIdentity();
          return current.host === identity.host && current.tokenFingerprint === identity.tokenFingerprint;
        } catch { return false; }
      };
      const generation = reserveBusinessSkillContext({ ...identity, stateDirectory });
      context = { ...identity, stateDirectory, generation, isCurrentContext };
      // Only the first ledger migration can adopt copies matching the old installed package.
      // Capture it before npm replaces the source; later manual copies remain unowned.
      if (!fs.existsSync(path.join(stateDirectory, 'business-skills.json')) && installedBefore?.name === packageName) {
        const previousSkills = path.join(packageRoot, 'skills');
        try {
          readBundledSkills(previousSkills);
          syncSkills({ ...context, skillsDirectory: previousSkills, businesses: {}, mode: 'adopt', packageVersion: installedBefore.version });
        } catch {
          report.next_steps.push('Existing Skills could not be adopted from the previous package; unmatched copies will be preserved.');
        }
      }
      if (!isBusinessSkillContextCurrent(context)) {
        return failInstallation(report, 'skills_local', 'The active environment changed before installation. Re-run install or update for the current environment.');
      }
    }
    if (options.skipCliInstall || (installedBefore?.name === packageName && installedBefore.version === target && fs.existsSync(bin))) {
      report.cli.action = 'skipped';
      progress('[ae-cli] [2/4] Verifying the existing CLI...');
    } else {
      stage = 'npm_install';
      progress(`[ae-cli] [2/4] Installing ${packageName}@${target}...`);
      const result = runner(npm, ['install', '-g', `${packageName}@${target}`, '--registry', config.registry], INSTALL_TIMEOUT_MS);
      if (!commandSucceeded(result)) return failInstallation(report, stage, 'npm installation failed. Check network access and a user-writable npm prefix; do not use sudo.', classifyInstallFailure(result));
      report.cli.action = 'installed';
    }
    stage = 'package_validation';
    const installed = readPackage(packageRoot);
    if (installed?.name !== packageName || installed.version !== target) return failInstallation(report, stage, 'Installed CLI package identity or version does not match the requested distribution.');
    if (!fs.existsSync(bin)) return failInstallation(report, stage, 'npm did not create the global ae-cli executable. Enable npm bin-links, reinstall, and add the global executable directory to PATH.');
    if (!cliBinBelongsToPackage(bin, packageRoot, platform)) return failInstallation(report, stage, 'The global executable does not belong to the installed CLI package.');
    const versionResult = runner(bin, ['--version'], 15_000);
    if (!commandSucceeded(versionResult) || versionResult.stdout.trim() !== target) return failInstallation(report, stage, 'ae-cli --version did not return the requested version. Refresh the shell command cache and check npm bin links.');
    report.cli.entrypoint = fs.realpathSync(path.join(packageRoot, 'bin', 'ae-cli.js'));
    report.cli.verified = true;
    const pathKey = platform === 'win32' ? Object.keys(env).find(key => key.toLowerCase() === 'path') : 'PATH';
    const installedPathBin = (env[pathKey ?? 'PATH'] ?? '').split(platform === 'win32' ? ';' : path.delimiter)
      .filter(Boolean).map(dir => path.join(dir.replace(/^"(.*)"$/, '$1'), platform === 'win32' ? 'ae-cli.cmd' : 'ae-cli'))
      .find(file => fs.existsSync(file) && !file.includes(`${path.sep}_npx${path.sep}`));
    if (!installedPathBin || fs.realpathSync(installedPathBin) !== fs.realpathSync(bin)) {
      report.cli.warnings.push(`Add ${path.dirname(bin)} to the front of PATH and refresh the shell command cache. The absolute executable was verified.`);
      report.next_steps.push(`Use the verified executable at ${bin}, or correct PATH before invoking ae-cli.`);
    }

    if (skipSkills) {
      report.skills.status = 'skipped';
      report.next_steps.push(skipSkills);
      progress(`[ae-cli] [3/4] ${skipSkills}`);
    } else if (context) {
      stage = 'skills_local';
      const skillsPath = path.join(packageRoot, 'skills');
      const skills = readBundledSkills(skillsPath);
      if (!isBusinessSkillContextCurrent(context)) {
        return failInstallation(report, stage, 'The active environment changed during CLI installation. Re-run install or update to synchronize its Skills.');
      }
      // Read after npm completes so a newer config snapshot cannot be undone by an upgrade.
      const token = context.host ? peekCliToken(context.host) : undefined;
      const knownBusinesses = options.businesses ?? (token ? readBusinessConfig(context.host, token) : undefined);
      const businesses = knownBusinesses ?? Object.fromEntries(OPTIONAL_BUSINESSES.map(business => [business, true]));
      const expected = skills.filter(skill => getSkillBusinessState(skill.name, businesses) === true);
      report.skills.expected_count = expected.length;
      report.skills.source = 'installed-package';
      progress('[ae-cli] [3/4] Synchronizing managed Skills for the current environment...');
      const synchronized = syncSkills({ ...context, skillsDirectory: skillsPath, businesses, packageVersion: target });
      report.skills.synchronization = synchronized;
      report.skills.failures = verifyGlobalSkills(expected, report.skills.directory);
      report.skills.missing = report.skills.failures.map(failure => failure.skill);
      report.skills.installed_count = expected.length - report.skills.missing.length;
      for (const item of [...synchronized.failed, ...synchronized.skipped]) {
        if (!report.skills.failures.some(failure => failure.skill === item.skill)) {
          report.skills.failures.push({ skill: item.skill, reason: item.reason ?? 'Managed Skill synchronization did not complete.' });
        }
      }
      report.skills.status = synchronized.status === 'success' && !report.skills.failures.length ? 'success'
        : report.skills.installed_count || synchronized.installed.length || synchronized.removed.length ? 'partial' : 'failed';
      report.skills.attempts.push({ source: 'installed-package', stage, cause: report.skills.status === 'success' ? null : 'validation', failures: [...report.skills.failures] });
      if (report.skills.status !== 'success') {
        return failInstallation(report, stage, 'Managed Skill synchronization is incomplete. User-modified and unowned copies were preserved; see skills.synchronization for details.',
          synchronized.status === 'busy' ? 'busy' : 'validation');
      }
    }
    progress('[ae-cli] [4/4] Checking authentication guidance...');
    if (report.auth.host) {
      // Delegate all host/credential semantics to the existing auth command. Never surface its raw output.
      const result = runner(bin, ['--no-update-check', '--format', 'json', 'auth', 'status', '--host', report.auth.host], INSTALL_TIMEOUT_MS);
      try {
        const body = JSON.parse(result.stdout);
        if (!commandSucceeded(result) || !body.ok || typeof body.data?.authenticated !== 'boolean') throw new Error();
        report.auth.authenticated = body.data.authenticated;
      } catch {
        report.auth.warnings.push('Authentication status could not be verified. Run auth status for this host.');
      }
    }
    if (report.auth.authenticated !== true) {
      report.next_steps.push(`ae-cli auth login --host ${report.auth.host ?? '<AE_HOST>'} --no-wait`);
      report.next_steps.push('Complete browser authorization, then run ae-cli auth login --host <AE_HOST> --device-code <DEVICE_CODE>.');
    }
    report.ok = true;
    return report;
  } catch (error) {
    // Only our input/bundle errors are safe to display; never forward arbitrary runner/fs error text.
    const safe = error instanceof Error && /^(Expected an exact|Unsupported CLI package|Host must|Invalid bundled Skill|Bundled Skills are empty)/.test(error.message);
    return failInstallation(report, stage, safe ? error.message : 'Installation could not complete at this stage. Check file permissions, package contents, and global Skills directory.');
  }
}
