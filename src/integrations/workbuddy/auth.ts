import type { Command } from 'commander';
import { loadConfig, saveConfig } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { normalizeUrl } from '../../core/url-utils.js';
import { startWorkBuddyHostPage, validateWorkBuddyHost } from './host-page.js';

interface WorkBuddyHostConfigDependencies {
  readConfig?: typeof loadConfig;
  writeConfig?: typeof saveConfig;
}

export function activateWorkBuddySelectedHost(
  selectedHost: string,
  dependencies: WorkBuddyHostConfigDependencies = {},
): string {
  const validation = validateWorkBuddyHost(selectedHost);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const host = normalizeUrl(validation.host);
  const readConfig = dependencies.readConfig ?? loadConfig;
  const writeConfig = dependencies.writeConfig ?? saveConfig;
  const config = readConfig();
  if (!config.hosts[host]) {
    const hostname = new URL(host).hostname;
    const labelExists = Object.entries(config.hosts)
      .some(([url, entry]) => url !== host && entry.label === hostname);
    config.hosts[host] = { label: labelExists ? host : hostname };
  }
  config.activeHost = host;
  writeConfig(config);
  logger.info(`Active host set to ${host} for WorkBuddy login`);
  return host;
}

export function registerWorkBuddyAuth(auth: Command): void {
  auth
    .command('workbuddy-host-page', { hidden: true })
    .description('Run the local WorkBuddy host selection page')
    .action(async () => {
      const page = await startWorkBuddyHostPage({
        onSelect: async host => {
          activateWorkBuddySelectedHost(host);
        },
      });
      process.stderr.write(`[ae-cli] WorkBuddy host selection:\n ${page.url} \n`);
      const selected = await Promise.race([
        page.selection.then(() => true),
        waitForTerminationSignal().then(() => false),
      ]);
      await page.close();
      if (!selected) process.exitCode = 1;
    });
}

function waitForTerminationSignal(): Promise<void> {
  return new Promise(resolve => {
    const finish = () => {
      process.off('SIGINT', finish);
      process.off('SIGTERM', finish);
      resolve();
    };
    process.once('SIGINT', finish);
    process.once('SIGTERM', finish);
  });
}
