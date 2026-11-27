import { isOnboardingProgressHost } from './onboarding/progress.js';
import { CHINA_TRIAL_SAAS_PRODUCT_HOST, isUsOnboarding, OVERSEAS_TEST_PRODUCT_HOSTNAME, US_ONBOARDING_LANGUAGE } from './onboarding/contracts.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getLocalCliPackageInfo } from './package-info.js';
import { globalSkillsDirectory, readInstallableSkills, verifyGlobalSkills, type SkillFailure } from './skills-install.js';
import { getActiveHost, getConfigDir } from './config.js';
import { peekCliToken } from './cli-token.js';
import {
  aeRegistrationUrl, existingAccountOptions, localRegistrationLanguage, onboardingDeviceMarket, registrationLanguage,
  type AeRegistrationLanguage,
} from './host-guidance.js';
import { cliEntrySource } from './website-entry.js';
import { readBusinessConfig } from './business-config.js';
import { canManageGlobalSkills } from './local-skill-context.js';
import { OPTIONAL_BUSINESSES, getSkillBusinessState, type BusinessStates } from './businesses.js';
import { isBusinessSkillContextCurrent, reserveBusinessSkillContext, syncBusinessSkills, type BusinessSkillSyncReport } from './business-skill-sync.js';
import {
  commandSucceeded, classifyInstallFailure, defaultInstallRunner, exactVersion, installHost,
  resolveNodeTool, INSTALL_TIMEOUT_MS, type ProcessRunner,
} from './install-process.js';

const accountChoice = {
  step: 'choose_account',
  question: 'How would you like to connect to AE?',
  options: [
    { value: 'create_account', label: 'Create an AE account' },
    { value: 'existing_account', label: 'Sign in to my existing AE account' },
  ],
} as const;

const usOnboardingGuidance = `Use English (${US_ONBOARDING_LANGUAGE}) throughout US onboarding. Put a dollar sign before every displayed amount, such as $100. The market takes precedence over the device and conversation language.`;

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
  local_language?: AeRegistrationLanguage;
  onboarding_market?: 'cn' | 'us';
  onboarding_skill_path?: string;
  next_action?: 'choose_account' | 'continue_using_ae' | 'check_authentication' | 'check_onboarding';
  interaction?: typeof accountChoice;
  existing_account_options?: ReturnType<typeof existingAccountOptions>;
  next_steps: string[];
  commands?: string[];
  error?: { type: 'config'; code: string; message: string; stage: string; cause: string };
}

export interface InstallationOptions {
  target?: string;
  packageName?: string;
  host?: string;
  dryRun?: boolean;
  guideAccountSetup?: boolean;
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
    // Keep the next interaction and detected language visible before Skill synchronization details.
    next_action: undefined, interaction: undefined, existing_account_options: undefined, local_language: undefined,
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
          readInstallableSkills(previousSkills);
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
      const skills = readInstallableSkills(skillsPath);
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
    const guideAccountSetup = options.guideAccountSetup && report.skills.status === 'success';
    if (guideAccountSetup && !report.auth.host && context?.host) {
      try {
        report.auth.host = installHost(context.host);
      } catch {
        report.auth.warnings.push('The configured AE host could not be used to check authentication.');
      }
    }
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
    if (options.guideAccountSetup && !guideAccountSetup) {
      report.ok = true;
      return report;
    }
    const confirmedHost = (options.host || report.auth.authenticated === true) ? report.auth.host : null;
    const usOnboarding = isUsOnboarding(confirmedHost ?? undefined);
    if (guideAccountSetup) {
      const localLanguage = localRegistrationLanguage(env, platform, runner);
      if (localLanguage) report.local_language = localLanguage;
      report.onboarding_market = usOnboarding ? 'us' : onboardingDeviceMarket(localLanguage);
      const onboardingSkillPath = path.join(packageRoot, 'skills', 'ae-onboarding', 'SKILL.md');
      if (fs.existsSync(onboardingSkillPath)) report.onboarding_skill_path = onboardingSkillPath;
      if (report.auth.authenticated === true) {
        report.next_action = isOnboardingProgressHost(report.auth.host ?? undefined) ? 'check_onboarding' : 'continue_using_ae';
      }
      else if (report.auth.warnings.length > 0) report.next_action = 'check_authentication';
      else {
        report.next_action = 'choose_account';
        if (!options.host) report.existing_account_options = existingAccountOptions(localLanguage);
      }
    }
    if (report.auth.authenticated === true) {
      if (report.next_action === 'check_onboarding') {
        report.next_steps.push(`Check the signed-in account with ae-cli analysis onboarding progress --format json --host ${report.auth.host}. Offer the current Demo only for not_started or in_progress. Continue the user’s specific AE task first when one was requested.`);
        if (usOnboarding) report.next_steps.push(usOnboardingGuidance);
      } else {
        report.next_steps.push('You are signed in. Continue your AE task in this AI tool using the existing environment.');
      }
    } else if (report.next_action === 'check_authentication') {
      const hostOption = report.auth.host ? ` --host ${report.auth.host}` : '';
      report.next_steps.push(`Check the configured AE environment with ae-cli auth status${hostOption} --format json. If it still cannot be verified, confirm the intended environment before starting signup or login.`);
    } else {
      const chooseAccount = report.next_action === 'choose_account';
      const source = cliEntrySource(undefined, env);
      if (chooseAccount) {
        report.interaction = accountChoice;
        report.next_steps.push(
          'After verifying a fresh install, when the user has left the account route open, offer “Create an AE account” and “Sign in to my existing AE account” in the resolved onboarding language. ' +
          `${usOnboardingGuidance} ` +
          'In an AI Agent, show these options in the same turn using the native choice dialog, even for a request that only asks to install. Keep the turn open until the user chooses or dismisses the dialog. If the dialog is unavailable or fails, ask with the same options in chat. ' +
          'A supplied host only identifies the environment. Wait for the account choice before starting signup or device authorization. For an explicit existing-account login request, use the original AE environment.',
        );
        report.next_steps.push('For an explicit onboarding or walkthrough that needs a new account, show “Create an AE account” and “Learn about AE” using the localized labels from references/about-ae.md next to onboarding_skill_path. If they choose “Learn about AE”, show the localized introduction and available product resources from that reference. Offer “Create an AE account” and wait for their choice.');
      }
      if (chooseAccount || !report.auth.host) {
        if (chooseAccount) {
          report.next_steps.push(`After the user confirms signup in the overseas test environment, run ae-cli analysis onboarding run --website-env test --region us --source ${source} --browser system --format json. Use jp or kr for the corresponding requested test market and keep the returned session_id.`);
          report.next_steps.push(
            'For production signup, honor an explicitly requested or confirmed market first. Use the US free trial for an English device and the China free trial for a Chinese device. For other or unknown device languages, compare local_language with the language of the user’s own request, excluding commands, links, quoted text, and picker labels. Map Chinese to cn, English to us, Japanese to jp, and Korean to kr. If both signals agree or only one maps to a market, use that market. When the two markets differ, show only those two options and wait. Use us if neither language maps to a market.',
            `After the user chooses “Create an AE account” or directly asks to sign up, run ae-cli analysis onboarding run --region <market> --website-env production --source ${source} --browser system --format json with the resolved production market. Pass --language separately for the display preference. If the browser cannot open, share the returned login_url. Read the returned skill_path and resume with its session_id after sign-in.`,
          );
        } else {
          const language = registrationLanguage(undefined, env);
          const registration = aeRegistrationUrl(language, env, source);
          report.next_steps.push(`New or returning website users: for guided website verification, run ae-cli analysis onboarding run --language ${language} --source ${source} --browser system. For manual registration or sign-in, use ${registration} in the system default browser.`);
        }
      }
      if (chooseAccount) report.next_steps.push(
        'Existing AE users: confirm their original AE environment URL when already known. ' +
        (report.existing_account_options
          ? 'Otherwise present existing_account_options.deployment and, for SaaS, existing_account_options.saas. Wait for confirmation of the SaaS choice, including any default. Ask for the usual AE login URL for private, unsure, or another address. Use the confirmed service host for any login commands that follow. '
          : 'Use the supplied host for the existing account when it matches the user’s intended environment. ') +
        'Follow the existing-account sign-in guide and check auth status on the selected AE service host before starting sign-in.',
      );
      else if (!report.auth.host) report.next_steps.push('Existing AE users: use your original environment URL, or ask your administrator.');
      if (chooseAccount && usOnboarding && confirmedHost) {
        const websiteEnv = new URL(confirmedHost).hostname === OVERSEAS_TEST_PRODUCT_HOSTNAME ? 'test' : 'production';
        report.next_steps.push(`For US onboarding with an existing account, run ae-cli analysis onboarding run --host ${confirmedHost} --region us --language ${US_ONBOARDING_LANGUAGE} --website-env ${websiteEnv} --source ${source} --browser system --format json. Resume with the returned session_id after signing in on the official website.`);
      } else if (chooseAccount && confirmedHost === CHINA_TRIAL_SAAS_PRODUCT_HOST) {
        report.next_steps.push(`For China free SaaS onboarding with an existing account, run ae-cli analysis onboarding run --host ${confirmedHost} --region cn --website-env production --source ${source} --browser system --format json. Resume with the returned session_id after signing in on the official website.`);
      } else {
        report.next_steps.push(`ae-cli auth login --host ${confirmedHost ?? '<AE_HOST>'} --no-wait`);
        report.next_steps.push('Complete browser authorization, then resume the same login using its returned host and device code. Keep the private device code local.');
      }
    }
    report.ok = true;
    return report;
  } catch (error) {
    // Only our input/bundle errors are safe to display; never forward arbitrary runner/fs error text.
    const safe = error instanceof Error && /^(Expected an exact|Unsupported CLI package|Host must|Invalid bundled Skill|Bundled Skills are empty)/.test(error.message);
    return failInstallation(report, stage, safe ? error.message : 'Installation could not complete at this stage. Check file permissions, package contents, and global Skills directory.');
  }
}
