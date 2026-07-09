import { Command } from 'commander';
import { addHost, loadConfig, setActiveHost } from '../core/config.js';
import {
  GLOBAL_QUERY_CONFIG_KEY,
  getAnalysisMappingPathForClusterMode,
  getClusterInfoFilePath,
  isGlobalQueryModeEnabled,
  setGlobalQueryModeEnabled,
} from '../core/cluster-info.js';
import { normalizeUrl } from '../core/url-utils.js';
import { printError, printOutput } from '../framework/output.js';

type HostView = { url: string; label: string; active: boolean };

export function registerConfig(program: Command): void {
  const configCmd = program
    .command('config')
    .description('AE host and environment configuration')
    .action(() => {
      printError('config', 'Missing subcommand.', 'Run: ae-cli config --help');
      process.exit(1);
    });

  configCmd
    .command('list')
    .description('List configured AE environments')
    .action(() => {
      printConfigList(program);
    });

  configCmd
    .command('current')
    .description('Show the active AE environment')
    .action(() => {
      printCurrentConfig(program);
    });

  configCmd
    .command('use <env>')
    .description('Switch active AE environment by exact URL or unique label')
    .action((env: string) => {
      useConfigEnv(program, env);
    });

  configCmd
    .command('set-host <url>')
    .description('Set the active AE host non-interactively (adds it if not already configured)')
    .option('--label <label>', 'Display label for this host (defaults to the host URL)')
    .action((url: string, opts: { label?: string }) => {
      const normalized = normalizeUrl(url);
      const label = opts.label || normalized;
      addHost(normalized, label);
      setActiveHost(normalized);
      printOutput({ activeHost: normalized, label }, program.opts().format || 'json');
    });

  const clusterMode = configCmd
    .command('cluster-mode')
    .description('Manage local multi-cluster analysis MCP mode')
    .action(() => {
      printClusterModeStatus(program);
    });

  clusterMode
    .command('status')
    .description('Show local multi-cluster analysis MCP mode')
    .action(() => {
      printClusterModeStatus(program);
    });

  clusterMode
    .command('enable')
    .description('Enable local multi-cluster analysis MCP mode')
    .action(() => {
      setGlobalQueryModeEnabled(true);
      printClusterModeStatus(program);
    });

  clusterMode
    .command('disable')
    .description('Disable local multi-cluster analysis MCP mode')
    .action(() => {
      setGlobalQueryModeEnabled(false);
      printClusterModeStatus(program);
    });
}

function printClusterModeStatus(program: Command): void {
  const enabled = isGlobalQueryModeEnabled();
  printOutput({
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

function printConfigList(program: Command): void {
  const { activeHost, hosts } = readHostViews();
  printOutput({ activeHost, hosts }, program.opts().format || 'json', program.opts().jq);
}

function printCurrentConfig(program: Command): void {
  const { activeHost, hosts } = readHostViews();
  const current = hosts.find(h => h.url === activeHost);
  if (!current) {
    failConfig('No active AE environment configured.', 'Run: ae-cli config use <env> or ae-cli config list');
    return;
  }
  printOutput({ activeHost: current.url, label: current.label }, program.opts().format || 'json', program.opts().jq);
}

function useConfigEnv(program: Command, env: string): void {
  const target = resolveHost(env);
  if (target.status === 'not-found') {
    failConfig(
      `No AE environment matched: ${env}`,
      target.hosts.length > 0
        ? `Available environments: ${formatHostOptions(target.hosts)}`
        : 'Run: ae-cli config list',
    );
    return;
  }
  if (target.status === 'duplicate-label') {
    failConfig(
      `Duplicate label: ${env}`,
      `Rename duplicate labels first. Run: ae-cli config list — ${formatHostOptions(target.matches)}`,
    );
    return;
  }

  setActiveHost(target.host.url);
  printOutput({ activeHost: target.host.url, label: target.host.label }, program.opts().format || 'json', program.opts().jq);
}

type HostResolveResult =
  | { status: 'found'; host: HostView }
  | { status: 'duplicate-label'; matches: HostView[] }
  | { status: 'not-found'; hosts: HostView[] };

function resolveHost(env: string): HostResolveResult {
  const raw = env.trim();
  const selector = raw.startsWith('http://') || raw.startsWith('https://') ? normalizeUrl(raw) : raw;
  const { hosts } = readHostViews();
  const byUrl = hosts.find(h => h.url === selector);
  if (byUrl) return { status: 'found', host: byUrl };

  const byLabel = hosts.filter(h => h.label === raw);
  if (byLabel.length === 1) return { status: 'found', host: byLabel[0] };
  if (byLabel.length > 1) return { status: 'duplicate-label', matches: byLabel };
  return { status: 'not-found', hosts };
}

function formatHostOptions(hosts: HostView[]): string {
  return hosts.map(h => `${h.label} (${h.url})`).join(', ');
}

function failConfig(message: string, hint: string): void {
  printError('config', message, hint);
  process.exitCode = 1;
}
