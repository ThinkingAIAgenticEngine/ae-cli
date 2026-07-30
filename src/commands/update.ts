import { Command } from 'commander';
import { peekCliToken } from '../core/cli-token.js';
import { getActiveHost } from '../core/config.js';
import { fetchCliConfig, getCachedCompatForHost } from '../core/compat-check.js';
import { normalizeUrl } from '../core/url-utils.js';
import { missingAeHostHint } from '../core/host-guidance.js';
import {
  buildVersionInstallPlan,
  friendlyVersionSyncFailure,
  installVersion,
  recordVersionSyncResult,
} from '../core/version-sync.js';
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
  skillsSources: Array<'installed-package' | 'github-fallback'>;
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

      const result = installVersion(target, {
        progress: (message) => process.stderr.write(`${message}\n`),
      });
      if (host) {
        recordVersionSyncResult(host, target, result);
      }
      if (!result.ok) {
        const message =
          result.skillsPending
            ? `ae-cli ${target} was installed, but Skills synchronization failed.`
            : `Could not install ae-cli ${target}.`;
        printError(
          'config',
          message,
          `${friendlyVersionSyncFailure(result)} Check access and run: ae-cli update`,
          'AE_CLI_UPDATE_FAILED',
          {
            target,
            stage: result.stage,
            cause: result.cause,
            skillsPending: result.skillsPending,
          },
        );
        process.exitCode = 1;
        return;
      }
      await printOutput(
        {
          action: 'update',
          dryRun: false,
          ...plan,
          skillsSource: result.skillsSource,
        },
        program.opts().format || 'json',
        program.opts().jq,
      );
    });
}

async function resolveTargetVersion(program: Command, opts: UpdateOptions): Promise<string | null> {
  if (opts.target) {
    return validateTarget(opts.target);
  }

  const host = resolveUpdateHost(program, opts);
  if (!host) {
    failUpdate('No AE host configured.', missingAeHostHint('Alternatively, pass --target <version>.'));
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
  const installPlan = buildVersionInstallPlan(target);
  return {
    target: installPlan.target,
    ...(host ? { host } : {}),
    commands: installPlan.commands,
    skillsSources: installPlan.skillsSources,
  };
}

function failUpdate(message: string, hint: string): void {
  printError('config', message, hint);
  process.exitCode = 1;
}
