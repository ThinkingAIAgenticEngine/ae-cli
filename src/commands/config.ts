import { Command } from 'commander';
import * as readline from 'node:readline';
import {
  addHost,
  loadConfig,
  removeHost,
  resolveHostSelector,
  setActiveHost,
  updateHostLabel,
  type ConfiguredHost,
  type HostSelectorResult,
} from '../core/config.js';
import {
  GLOBAL_QUERY_CONFIG_KEY,
  getAnalysisMappingPathForClusterMode,
  getClusterInfoFilePath,
  isGlobalQueryModeEnabled,
  setGlobalQueryModeEnabled,
} from '../core/cluster-info.js';
import { normalizeUrl } from '../core/url-utils.js';
import { missingAeHostHint } from '../core/host-guidance.js';
import { printError, printOutput } from '../framework/output.js';
import { runConfigUI } from './config-ui.js';

type HostView = ConfiguredHost;

export function registerConfig(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage AE host environments interactively or with subcommands')
    .action(async () => {
      if (!process.stdin.isTTY || !process.stderr.isTTY) {
        failConfig(
          'Interactive config requires a TTY.',
          'Run: ae-cli config list, ae-cli config add <url> --label <label>, or ae-cli config --help',
        );
        return;
      }
      await runConfigUI();
    });

  configCmd
    .command('list')
    .description('List configured AE environments')
    .action(async () => {
      await printConfigList(program);
    });

  configCmd
    .command('current')
    .description('Show the active AE environment')
    .action(async () => {
      await printCurrentConfig(program);
    });

  configCmd
    .command('use <env>')
    .description('Switch active AE environment by exact URL or unique label')
    .action(async (env: string) => {
      await useConfigEnv(program, env);
    });

  configCmd
    .command('add <url>')
    .description('Add an AE environment')
    .requiredOption('--label <label>', 'Unique display label for this environment')
    .option('--use', 'Set the new environment as active')
    .action(async (url: string, opts: { label: string; use?: boolean }) => {
      await addConfigEnv(program, url, opts);
    });

  configCmd
    .command('rename <env> <label>')
    .description('Rename an AE environment selected by exact URL or unique label')
    .action(async (env: string, label: string) => {
      await renameConfigEnv(program, env, label);
    });

  configCmd
    .command('remove <env>')
    .alias('delete')
    .description('Remove an AE environment selected by exact URL or unique label')
    .option('--yes', 'Skip the deletion confirmation')
    .action(async (env: string, opts: { yes?: boolean }) => {
      await removeConfigEnv(program, env, Boolean(opts.yes || program.opts().yes));
    });

  configCmd
    .command('set-host <url>')
    .description('Compatibility command: add or update an AE host and set it active')
    .option('--label <label>', 'Display label for this host (defaults to the host URL)')
    .action(async (url: string, opts: { label?: string }) => {
      try {
        const normalized = normalizeUrl(url);
        const label = opts.label || normalized;
        addHost(normalized, label);
        setActiveHost(normalized);
        await printOutput(
          { activeHost: normalized, label: label.trim() },
          program.opts().format || 'json',
          program.opts().jq,
        );
      } catch (err: any) {
        failConfig(err.message, 'Run: ae-cli config list');
      }
    });

  const clusterMode = configCmd
    .command('cluster-mode')
    .description('Manage local multi-cluster analysis MCP mode')
    .action(async () => {
      await printClusterModeStatus(program);
    });

  clusterMode
    .command('status')
    .description('Show local multi-cluster analysis MCP mode')
    .action(async () => {
      await printClusterModeStatus(program);
    });

  clusterMode
    .command('enable')
    .description('Enable local multi-cluster analysis MCP mode')
    .action(async () => {
      setGlobalQueryModeEnabled(true);
      await printClusterModeStatus(program);
    });

  clusterMode
    .command('disable')
    .description('Disable local multi-cluster analysis MCP mode')
    .action(async () => {
      setGlobalQueryModeEnabled(false);
      await printClusterModeStatus(program);
    });
}

async function printClusterModeStatus(program: Command): Promise<void> {
  const enabled = isGlobalQueryModeEnabled();
  await printOutput({
    [GLOBAL_QUERY_CONFIG_KEY]: enabled,
    path: getClusterInfoFilePath(),
    analysisMappingPath: getAnalysisMappingPathForClusterMode(enabled),
  }, program.opts().format || 'json', program.opts().jq);
}

function readHostViews(): { activeHost: string; hosts: HostView[] } {
  const config = loadConfig();
  const hosts = Object.entries(config.hosts).map(([url, entry]) => ({
    url,
    label: entry.label,
    active: url === config.activeHost,
  }));
  return { activeHost: config.activeHost, hosts };
}

async function printConfigList(program: Command): Promise<void> {
  const { activeHost, hosts } = readHostViews();
  const activeLabel = hosts.find(host => host.active)?.label || '';
  await printOutput(
    { activeHost, activeLabel, hosts },
    program.opts().format || 'json',
    program.opts().jq,
  );
}

async function printCurrentConfig(program: Command): Promise<void> {
  const { activeHost, hosts } = readHostViews();
  const current = hosts.find(h => h.url === activeHost);
  if (!current) {
    failConfig('No active AE environment configured.', missingAeHostHint('Run ae-cli config list to inspect saved environments.'));
    return;
  }
  await printOutput({ activeHost: current.url, label: current.label }, program.opts().format || 'json', program.opts().jq);
}

async function useConfigEnv(program: Command, env: string): Promise<void> {
  const target = resolveHostSelector(env);
  if (target.status === 'not-found') {
    failHostResolution(env, target);
    return;
  }
  if (target.status === 'duplicate-label') {
    failHostResolution(env, target);
    return;
  }

  setActiveHost(target.host.url);
  await printOutput({ activeHost: target.host.url, label: target.host.label }, program.opts().format || 'json', program.opts().jq);
}

async function addConfigEnv(
  program: Command,
  url: string,
  opts: { label: string; use?: boolean },
): Promise<void> {
  const normalized = normalizeUrl(url);
  const config = loadConfig();
  if (config.hosts[normalized]) {
    failConfig(
      `AE environment is already configured: ${normalized}`,
      `Run: ae-cli config rename ${quoteSelector(config.hosts[normalized].label)} <label> or ae-cli config use ${quoteSelector(config.hosts[normalized].label)}`,
    );
    return;
  }

  try {
    addHost(normalized, opts.label);
    if (opts.use) setActiveHost(normalized);
    const saved = loadConfig();
    await printOutput(
      {
        url: normalized,
        label: saved.hosts[normalized].label,
        active: saved.activeHost === normalized,
      },
      program.opts().format || 'json',
      program.opts().jq,
    );
  } catch (err: any) {
    failConfig(err.message, 'Choose a non-empty, unique label and run the command again.');
  }
}

async function renameConfigEnv(program: Command, env: string, label: string): Promise<void> {
  const target = resolveHostSelector(env);
  if (target.status !== 'found') {
    failHostResolution(env, target);
    return;
  }

  try {
    updateHostLabel(target.host.url, label);
    await printOutput(
      { url: target.host.url, label: label.trim(), active: target.host.active },
      program.opts().format || 'json',
      program.opts().jq,
    );
  } catch (err: any) {
    failConfig(err.message, 'Choose a non-empty, unique label and run the command again.');
  }
}

async function removeConfigEnv(program: Command, env: string, skipConfirmation: boolean): Promise<void> {
  const target = resolveHostSelector(env);
  if (target.status !== 'found') {
    failHostResolution(env, target);
    return;
  }

  const hosts = readHostViews().hosts;
  if (target.host.active && hosts.length > 1) {
    failConfig(
      `Cannot remove the active AE environment: ${target.host.label}`,
      'Switch first with: ae-cli config use <env>',
    );
    return;
  }

  if (!skipConfirmation) {
    if (!process.stdin.isTTY) {
      failConfig(
        'Deletion confirmation requires a TTY.',
        `Re-run with --yes: ae-cli config remove ${quoteSelector(env)} --yes`,
      );
      return;
    }
    const confirmed = await confirm(`Remove ${target.host.label} (${target.host.url})?`);
    if (!confirmed) {
      await printOutput(
        { removed: false, url: target.host.url, label: target.host.label },
        program.opts().format || 'json',
        program.opts().jq,
      );
      return;
    }
  }

  removeHost(target.host.url);
  await printOutput(
    {
      removed: true,
      url: target.host.url,
      label: target.host.label,
      activeHost: loadConfig().activeHost,
    },
    program.opts().format || 'json',
    program.opts().jq,
  );
}

function failHostResolution(env: string, target: Exclude<HostSelectorResult, { status: 'found' }>): void {
  if (target.status === 'duplicate-label') {
    failConfig(
      `Duplicate label: ${env}`,
      `Rename duplicate labels first. Run: ae-cli config list — ${formatHostOptions(target.matches)}`,
    );
    return;
  }
  failConfig(
    `No AE environment matched: ${env}`,
    target.hosts.length > 0
      ? `Available environments: ${formatHostOptions(target.hosts)}`
      : missingAeHostHint(),
  );
}

function formatHostOptions(hosts: HostView[]): string {
  return hosts.map(h => `${h.label} (${h.url})`).join(', ');
}

function quoteSelector(value: string): string {
  return JSON.stringify(value);
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(`${message} [y/N] `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

function failConfig(message: string, hint: string): void {
  printError('config', message, hint);
  process.exitCode = 1;
}
