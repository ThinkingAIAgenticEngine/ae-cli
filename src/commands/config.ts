import { Command } from 'commander';
import { loadConfig, addHost, setActiveHost, removeHost, updateHostLabel, listHosts, getConfigDir } from '../core/config.js';
import { getAuthStatus, getToken } from '../core/auth.js';
import { printOutput } from '../framework/output.js';
import * as readline from 'readline';

export function registerConfig(program: Command): void {
  program
    .command('config')
    .description('Interactive TE host configuration manager')
    .action(async () => {
      await runConfigUI(program);
    });
}

async function runConfigUI(program: Command): Promise<void> {
  const hosts = listHosts();

  // No hosts configured — first-time setup
  if (hosts.length === 0) {
    process.stderr.write('\x1B[1m[ae-cli] No TE hosts configured. Let\'s add one.\x1B[0m\n\n');
    const newHost = await promptNewHost();
    if (!newHost) {
      process.stderr.write('Cancelled.\n');
      return;
    }
    addHost(newHost.url, newHost.label);
    setActiveHost(newHost.url);
    process.stderr.write(`\n\x1B[32m✓\x1B[0m Added and activated: \x1B[1m${newHost.label}\x1B[0m ${newHost.url}\n`);
    await ensureAuth(newHost.url);
    return;
  }

  // Show interactive host manager
  await hostManagerLoop(program);
}

async function hostManagerLoop(program: Command): Promise<void> {
  while (true) {
    const hosts = listHosts();

    const items: MenuItem[] = hosts.map(h => ({
      display: formatHostLine(h),
      type: 'host' as const,
      url: h.url,
      label: h.label,
      active: h.active,
    }));
    items.push({ display: '\x1B[2m  + Add new host...\x1B[0m', type: 'add' as const, url: '', label: '', active: false });

    const activeIdx = items.findIndex(i => i.active);

    process.stderr.write('\n\x1B[1mTE Host Manager\x1B[0m  (↑↓ select · Enter switch · e edit label · d delete · a add · q quit)\n\n');
    const result = await interactiveHostSelect(items, activeIdx >= 0 ? activeIdx : 0);

    if (result.action === 'quit' || result.action === 'cancel') {
      break;
    }

    const item = items[result.index];

    if (result.action === 'select') {
      if (item.type === 'add') {
        await handleAddHost();
      } else {
        // Switch to this host
        setActiveHost(item.url);
        process.stderr.write(`\n\x1B[32m✓\x1B[0m Switched to: \x1B[1m${item.label}\x1B[0m ${item.url}\n`);
        await ensureAuth(item.url);
        break;
      }
    } else if (result.action === 'edit' && item.type === 'host') {
      await handleEditLabel(item.url, item.label);
    } else if (result.action === 'delete' && item.type === 'host') {
      await handleDeleteHost(item.url, item.label, item.active);
    } else if (result.action === 'add') {
      await handleAddHost();
    }
  }
}

function formatHostLine(h: { url: string; label: string; active: boolean }): string {
  const marker = h.active ? '\x1B[32m●\x1B[0m' : '\x1B[2m○\x1B[0m';
  const labelText = h.active ? `\x1B[1;32m${h.label}\x1B[0m` : `\x1B[1m${h.label}\x1B[0m`;
  const authInfo = getAuthStatus(h.url);
  const authBadge = authInfo.authenticated
    ? `\x1B[32m✓\x1B[0m`
    : `\x1B[31m✗\x1B[0m`;
  return `${marker} ${labelText}  ${h.url}  ${authBadge}`;
}

async function handleAddHost(): Promise<void> {
  const newHost = await promptNewHost();
  if (!newHost) {
    process.stderr.write('Cancelled.\n');
    return;
  }
  addHost(newHost.url, newHost.label);
  setActiveHost(newHost.url);
  process.stderr.write(`\n\x1B[32m✓\x1B[0m Added and activated: \x1B[1m${newHost.label}\x1B[0m ${newHost.url}\n`);
  await ensureAuth(newHost.url);
}

async function handleEditLabel(url: string, currentLabel: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const newLabel = await new Promise<string>(resolve =>
    rl.question(`\nNew label [${currentLabel}]: `, a => { rl.close(); resolve(a.trim() || currentLabel); })
  );
  if (newLabel !== currentLabel) {
    updateHostLabel(url, newLabel);
    process.stderr.write(`\x1B[32m✓\x1B[0m Label updated: ${newLabel}\n`);
  }
}

async function handleDeleteHost(url: string, label: string, isActive: boolean): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const answer = await new Promise<string>(resolve =>
    rl.question(`\nDelete \x1B[1m${label}\x1B[0m (${url})? [y/N]: `, a => { rl.close(); resolve(a.trim().toLowerCase()); })
  );
  if (answer === 'y' || answer === 'yes') {
    removeHost(url);
    process.stderr.write(`\x1B[32m✓\x1B[0m Deleted: ${label}\n`);
    if (isActive) {
      const remaining = listHosts();
      if (remaining.length > 0) {
        process.stderr.write(`  Active host switched to: ${remaining[0].label}\n`);
      } else {
        process.stderr.write('  No hosts remaining. Run ae-cli config to add one.\n');
      }
    }
  }
}

async function ensureAuth(hostUrl: string): Promise<void> {
  const status = getAuthStatus(hostUrl);
  if (status.authenticated) {
    process.stderr.write(`\x1B[32m✓\x1B[0m Token valid for ${hostUrl}\n`);
    return;
  }
  process.stderr.write(`\n\x1B[33m!\x1B[0m No valid token for ${hostUrl}. Starting login...\n`);
  try {
    await getToken(hostUrl);
    process.stderr.write(`\x1B[32m✓\x1B[0m Authenticated to ${hostUrl}\n`);
  } catch (err: any) {
    process.stderr.write(`\x1B[31m✗\x1B[0m Auth failed: ${err.message}\n`);
    process.stderr.write(`  You can set token manually: ae-cli auth set-token <token>\n`);
  }
}

async function promptNewHost(): Promise<{ url: string; label: string } | null> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, a => resolve(a.trim())));

  const url = await ask('TE host URL (e.g., https://ta.thinkingdata.cn): ');
  if (!url) { rl.close(); return null; }
  const label = await ask('Label: ');
  rl.close();
  if (!label) return null;

  return { url: normalizeUrl(url), label };
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, '');
}

// --- Interactive TUI ---

interface MenuItem {
  display: string;
  type: 'host' | 'add';
  url: string;
  label: string;
  active: boolean;
}

interface SelectResult {
  action: 'select' | 'edit' | 'delete' | 'add' | 'quit' | 'cancel';
  index: number;
}

function interactiveHostSelect(items: MenuItem[], initialIndex: number): Promise<SelectResult> {
  return new Promise((resolve) => {
    let cursor = initialIndex;
    const stdin = process.stdin;
    const stderr = process.stderr;
    let renderCount = 0;

    stderr.write('\x1B[?25l'); // hide cursor

    function render() {
      if (renderCount > 0) {
        stderr.write(`\x1B[${items.length}A`);
      }
      for (let i = 0; i < items.length; i++) {
        const pointer = i === cursor ? '\x1B[36m❯\x1B[0m' : ' ';
        stderr.write(`${pointer} ${items[i].display}\x1B[K\n`);
      }
      renderCount++;
    }

    render();

    if (!stdin.isTTY) {
      stderr.write('\x1B[?25h');
      resolve({ action: 'select', index: initialIndex });
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stderr.write('\x1B[?25h'); // show cursor
    }

    function onData(key: string) {
      if (key === '\x1B[A' || key === 'k') {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (key === '\x1B[B' || key === 'j') {
        cursor = (cursor + 1) % items.length;
        render();
      } else if (key === '\r' || key === '\n') {
        cleanup();
        resolve({ action: 'select', index: cursor });
      } else if (key === 'e' || key === 'E') {
        if (items[cursor].type === 'host') {
          cleanup();
          resolve({ action: 'edit', index: cursor });
        }
      } else if (key === 'd' || key === 'D') {
        if (items[cursor].type === 'host') {
          cleanup();
          resolve({ action: 'delete', index: cursor });
        }
      } else if (key === 'a' || key === 'A') {
        cleanup();
        resolve({ action: 'add', index: cursor });
      } else if (key === 'q' || key === 'Q' || key === '\x1B' || key === '\x03') {
        cleanup();
        resolve({ action: 'quit', index: cursor });
      }
    }

    stdin.on('data', onData);
  });
}
