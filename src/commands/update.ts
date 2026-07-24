import { spawnSync } from 'node:child_process';
import { Command } from 'commander';
import { peekCliToken } from '../core/cli-token.js';
import { getActiveHost } from '../core/config.js';
import { fetchCliConfig, getCachedCompatForHost } from '../core/compat-check.js';
import { AE_CLI_SKILLS_REPO, OPEN_SOURCE_AE_CLI_PACKAGE } from '../core/version-compat.js';
import { normalizeUrl } from '../core/url-utils.js';
import { printError, printOutput } from '../framework/output.js';

const HOST_OPTION_DESC = 'Override active AE host URL (e.g., https://ta.thinkingdata.cn)';
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+].*)?$/;

type UpdateOptions = {
  host?: string;
  target?: string;
};

type UpdatePlan = {
  target: string;
  host?: string;
  commands: string[];
};

export function registerUpdate(program: Command): void {
  program
    .command('update')
    .description('Install the ae-cli and Skills version required by the current AE host')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--target <version>', 'Install a specific ae-cli version instead of reading the active host')
    .action(async (opts: UpdateOptions) => {
      const target = await resolveTargetVersion(program, opts);
      if (!target) return;

      const host = resolveUpdateHost(program, opts);
      const plan = buildUpdatePlan(target, host);
      if (program.opts().dryRun) {
        await printOutput({ action: 'update', dryRun: true, ...plan }, program.opts().format || 'json', program.opts().jq);
        return;
      }

      runCommand('npm', ['i', '-g', `${OPEN_SOURCE_AE_CLI_PACKAGE}@${target}`]);
      runCommand('npx', ['skills', 'add', `${AE_CLI_SKILLS_REPO}#v${target}`, '-g', '-y']);
      await printOutput({ action: 'update', dryRun: false, ...plan }, program.opts().format || 'json', program.opts().jq);
    });
}

async function resolveTargetVersion(program: Command, opts: UpdateOptions): Promise<string | null> {
  if (opts.target) {
    return validateTarget(opts.target);
  }

  const host = resolveUpdateHost(program, opts);
  if (!host) {
    failUpdate('No AE host configured.', 'Run: ae-cli config set-host <url>, or pass --target <version>.');
    return null;
  }

  const token = peekCliToken(host);
  if (token) {
    const remote = await fetchCliConfig(host, token);
    if (remote?.aeCliVersion) {
      return validateTarget(remote.aeCliVersion);
    }
  }

  const cached = getCachedCompatForHost(host);
  if (cached?.expectedVersion) {
    return validateTarget(cached.expectedVersion);
  }

  failUpdate(
    'Could not determine the ae-cli version required by this host.',
    'Run: ae-cli auth login --host <url>, or pass --target <version>.',
  );
  return null;
}

function validateTarget(version: string): string | null {
  const target = version.trim().replace(/^v/i, '');
  if (!SEMVER_RE.test(target)) {
    failUpdate(`Invalid target version: ${version}`, 'Expected semver like 6.0.34 or 6.1.6.');
    return null;
  }
  return target;
}

function resolveUpdateHost(program: Command, opts: UpdateOptions): string | undefined {
  const raw = opts.host || program.opts().host || getActiveHost();
  return raw ? normalizeUrl(raw) : undefined;
}

function buildUpdatePlan(target: string, host?: string): UpdatePlan {
  return {
    target,
    ...(host ? { host } : {}),
    commands: [
      `npm i -g ${OPEN_SOURCE_AE_CLI_PACKAGE}@${target}`,
      `npx skills add ${AE_CLI_SKILLS_REPO}#v${target} -g -y`,
    ],
  };
}

function runCommand(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function failUpdate(message: string, hint: string): void {
  printError('config', message, hint);
  process.exitCode = 1;
}
