import * as readline from 'node:readline';
import {
  addHost,
  listHosts,
  removeHost,
  setActiveHost,
  updateHostLabel,
  type ConfiguredHost,
} from '../core/config.js';
import { MultiselectCancelled, promptSingleSelect } from '../core/multiselect.js';
import { normalizeUrl } from '../core/url-utils.js';
import { AE_TRIAL_URL } from '../core/host-guidance.js';

interface MenuItem {
  type: 'host' | 'add';
  host?: ConfiguredHost;
}

type MenuAction = 'select' | 'rename' | 'remove' | 'add' | 'quit';

interface MenuResult {
  action: MenuAction;
  index: number;
}

export async function runConfigUI(): Promise<void> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    throw new Error('Interactive config requires a TTY.');
  }

  if (listHosts().length === 0) {
    process.stderr.write('\n\x1B[1mNo AE environments configured.\x1B[0m\n\n');
    process.stderr.write('Use the AE URL provided by your AgenticEngine administrator.\n');
    process.stderr.write(`No AgenticEngine environment? Request a trial: ${AE_TRIAL_URL}\n\n`);
    await promptAddEnvironment();
    return;
  }

  while (true) {
    const hosts = listHosts();
    const items: MenuItem[] = [
      ...hosts.map(host => ({ type: 'host' as const, host })),
      { type: 'add' },
    ];
    const activeIndex = Math.max(0, hosts.findIndex(host => host.active));
    const result = await promptEnvironmentAction(items, activeIndex);
    const item = items[result.index];

    if (result.action === 'quit') return;
    if (result.action === 'add' || item.type === 'add') {
      await promptAddEnvironment();
      continue;
    }
    if (!item.host) continue;

    if (result.action === 'select') {
      if (item.host.active) {
        process.stderr.write(`\nAlready active: \x1B[1m${item.host.label}\x1B[0m\n`);
        return;
      }
      setActiveHost(item.host.url);
      process.stderr.write(`\n\x1B[32m✓\x1B[0m Active environment: \x1B[1m${item.host.label}\x1B[0m ${item.host.url}\n`);
      process.stderr.write(`  Authenticate if needed: ae-cli auth login --host ${item.host.url}\n`);
      return;
    }
    if (result.action === 'rename') {
      await promptRenameEnvironment(item.host);
      continue;
    }
    if (result.action === 'remove') {
      await promptRemoveEnvironment(item.host);
    }
  }
}

async function promptAddEnvironment(): Promise<void> {
  const urlInput = await ask('Host URL: ');
  if (!urlInput) {
    process.stderr.write('Cancelled.\n');
    return;
  }

  const url = normalizeUrl(urlInput);
  const existing = listHosts().find(host => host.url === url);
  if (existing) {
    process.stderr.write(`\x1B[31m✗\x1B[0m Environment already configured as ${existing.label}: ${url}\n`);
    return;
  }

  const defaultLabel = defaultLabelForUrl(url);
  const labelInput = await ask(`Label [${defaultLabel}]: `);
  const label = labelInput || defaultLabel;

  try {
    addHost(url, label);
    const active = listHosts().find(host => host.url === url)?.active;
    process.stderr.write(
      `\n\x1B[32m✓\x1B[0m Added${active ? ' and activated' : ''}: \x1B[1m${label}\x1B[0m ${url}\n`,
    );
    if (active) {
      process.stderr.write(`  Authenticate if needed: ae-cli auth login --host ${url}\n`);
    }
  } catch (err: any) {
    process.stderr.write(`\x1B[31m✗\x1B[0m ${err.message}\n`);
  }
}

async function promptRenameEnvironment(host: ConfiguredHost): Promise<void> {
  const input = await ask(`New label [${host.label}]: `);
  const label = input || host.label;
  if (label === host.label) return;

  try {
    updateHostLabel(host.url, label);
    process.stderr.write(`\x1B[32m✓\x1B[0m Renamed: ${host.label} → ${label}\n`);
  } catch (err: any) {
    process.stderr.write(`\x1B[31m✗\x1B[0m ${err.message}\n`);
  }
}

async function promptRemoveEnvironment(host: ConfiguredHost): Promise<void> {
  const hosts = listHosts();
  let replacement: ConfiguredHost | undefined;

  if (host.active && hosts.length > 1) {
    try {
      const replacementUrl = await promptSingleSelect({
        title: `Select the environment to activate after removing ${host.label}:`,
        items: hosts
          .filter(candidate => candidate.url !== host.url)
          .map(candidate => ({
            value: candidate.url,
            label: `${candidate.label}  ${candidate.url}`,
          })),
      });
      replacement = hosts.find(candidate => candidate.url === replacementUrl);
    } catch (err) {
      if (err instanceof MultiselectCancelled) return;
      throw err;
    }
  }

  const confirmed = await confirm(`Remove ${host.label} (${host.url})?`);
  if (!confirmed) {
    process.stderr.write('Cancelled.\n');
    return;
  }

  if (replacement) setActiveHost(replacement.url);
  removeHost(host.url);
  process.stderr.write(`\x1B[32m✓\x1B[0m Removed: ${host.label}\n`);
  if (replacement) {
    process.stderr.write(`  Active environment: ${replacement.label} ${replacement.url}\n`);
  } else if (listHosts().length === 0) {
    process.stderr.write('  No AE environments remain.\n');
  }
}

function promptEnvironmentAction(items: MenuItem[], initialIndex: number): Promise<MenuResult> {
  const stdin = process.stdin;
  const stderr = process.stderr;
  let cursor = initialIndex;
  let renderCount = 0;
  const lineCount = items.length + 4;

  function render(): void {
    if (renderCount > 0) stderr.write(`\x1B[${lineCount}A`);
    const active = items.find(item => item.host?.active)?.host;
    stderr.write('\x1B[1mAE Environment Manager\x1B[0m\x1B[K\n');
    stderr.write(`Active: ${active ? `${active.label}  ${active.url}` : 'none'}\x1B[K\n`);
    stderr.write('↑↓ select · Enter activate · e rename · d delete · a add · q quit\x1B[K\n');
    stderr.write('\x1B[K\n');
    items.forEach((item, index) => {
      const pointer = index === cursor ? '\x1B[36m❯\x1B[0m' : ' ';
      if (item.type === 'add') {
        stderr.write(`${pointer} \x1B[2m+ Add environment...\x1B[0m\x1B[K\n`);
        return;
      }
      const host = item.host!;
      const marker = host.active ? '\x1B[32m●\x1B[0m' : '\x1B[2m○\x1B[0m';
      const label = host.active ? `\x1B[1;32m${host.label}\x1B[0m` : `\x1B[1m${host.label}\x1B[0m`;
      const badge = host.active ? '  \x1B[32m[active]\x1B[0m' : '';
      stderr.write(`${pointer} ${marker} ${label}  ${host.url}${badge}\x1B[K\n`);
    });
    renderCount++;
  }

  return new Promise(resolve => {
    stderr.write('\n\x1B[?25l');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup(): void {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stderr.write('\x1B[?25h');
    }

    function finish(action: MenuAction): void {
      cleanup();
      resolve({ action, index: cursor });
    }

    function onData(key: string): void {
      if (key === '\x1B[A' || key === 'k') {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (key === '\x1B[B' || key === 'j') {
        cursor = (cursor + 1) % items.length;
        render();
      } else if (key === '\r' || key === '\n') {
        finish('select');
      } else if ((key === 'e' || key === 'E') && items[cursor].type === 'host') {
        finish('rename');
      } else if ((key === 'd' || key === 'D') && items[cursor].type === 'host') {
        finish('remove');
      } else if (key === 'a' || key === 'A') {
        finish('add');
      } else if (key === 'q' || key === 'Q' || key === '\x1B' || key === '\x03') {
        finish('quit');
      }
    }

    stdin.on('data', onData);
    render();
  });
}

function defaultLabelForUrl(url: string): string {
  try {
    return new URL(url).hostname.split('.')[0] || url;
  } catch {
    return url;
  }
}

async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function confirm(question: string): Promise<boolean> {
  const answer = await ask(`${question} [y/N] `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}
