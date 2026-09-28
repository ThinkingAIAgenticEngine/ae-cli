/**
 * auth login host resolution tests
 *
 * Run: npx tsx tests/auth-login-host.test.ts
 */
import assert from 'node:assert/strict';
import { spawn as spawnCommand, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function runInIsolatedHome(
  home: string,
  script: string,
  extraEnv: Record<string, string> = {},
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: home, ...extraEnv },
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function runWorkBuddyLogin(home: string): {
  status: number | null;
  stdout: string;
  stderr: string;
  elapsedMs: number;
} {
  const browserMarker = path.join(home, 'browser-opened');
  const fakeBin = path.join(home, 'bin');
  const fakeOpen = path.join(fakeBin, 'open');
  fs.mkdirSync(fakeBin, { recursive: true });
  fs.writeFileSync(fakeOpen, '#!/bin/sh\ntouch "$AE_CLI_BROWSER_MARKER"\n');
  fs.chmodSync(fakeOpen, 0o755);

  const startedAt = Date.now();
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--import',
      path.join(process.cwd(), 'tests/fixtures/workbuddy-auth-fetch.mock.mjs'),
      'src/index.ts',
      'auth',
      'login',
      '--no-browser',
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: home,
        AE_CLI_CONFIG_DIR: '${HOME}/.ae-cli-workbuddy',
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
        AE_CLI_BROWSER_MARKER: browserMarker,
      },
      encoding: 'utf8',
      timeout: 10000,
    },
  );

  assert.equal(fs.existsSync(browserMarker), false, 'WorkBuddy login must not open a browser itself');
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    elapsedMs: Date.now() - startedAt,
  };
}

function runWorkBuddyHostSelection(home: string): Promise<{
  status: number | null;
  stderr: string;
}> {
  const child = spawnCommand(
    process.execPath,
    ['--import', 'tsx', 'src/index.ts', 'auth', 'workbuddy-host-page'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: home,
        AE_CLI_CONFIG_DIR: '${HOME}/.ae-cli-workbuddy',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let stderr = '';
  let submitted = false;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`host selection command timed out: ${stderr}`));
    }, 10000);

    child.stderr.on('data', async chunk => {
      stderr += chunk.toString();
      const match = stderr.match(/http:\/\/127\.0\.0\.1:\d+\/workbuddy\/[A-Za-z0-9_-]+\//);
      if (!match || submitted) return;
      submitted = true;
      try {
        const response = await fetch(new URL('select', match[0]), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: 'https://selected.example.com/' }),
        });
        assert.equal(response.status, 200);
      } catch (error) {
        child.kill();
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', status => {
      clearTimeout(timeout);
      resolve({ status, stderr });
    });
  });
}

process.stdout.write('\nauth-login-host tests\n');

await test('resolveLoginTeClaudeBase: appends /agent to bare host', async () => {
  const { resolveLoginTeClaudeBase } = await import('../src/commands/auth.ts');
  assert.equal(
    resolveLoginTeClaudeBase('https://ta.example.com'),
    'https://ta.example.com/agent',
  );
});

await test('resolveLoginTeClaudeBase: ignores TE_CLAUDE_BASE_URL env', async () => {
  const { resolveLoginTeClaudeBase } = await import('../src/commands/auth.ts');
  const prev = process.env.TE_CLAUDE_BASE_URL;
  process.env.TE_CLAUDE_BASE_URL = 'http://override.local';
  try {
    assert.equal(
      resolveLoginTeClaudeBase('https://ta.example.com'),
      'https://ta.example.com/agent',
    );
  } finally {
    if (prev === undefined) delete process.env.TE_CLAUDE_BASE_URL;
    else process.env.TE_CLAUDE_BASE_URL = prev;
  }
});

await test('resolveLoginTeClaudeBase: does not double-append /agent', async () => {
  const { resolveLoginTeClaudeBase } = await import('../src/commands/auth.ts');
  assert.equal(
    resolveLoginTeClaudeBase('https://ta.example.com/agent'),
    'https://ta.example.com/agent',
  );
});

await test('activateHostAfterLogin: sets activeHost when explicit --host provided', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-auth-host-'));
  const configDir = path.join(home, '.ae-cli');
  fs.mkdirSync(configDir, { recursive: true });
  const configFile = path.join(configDir, 'config.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      activeHost: 'https://old.example.com',
      hosts: {
        'https://old.example.com': { label: 'old' },
        'https://other.example.com': { label: 'other' },
      },
    }),
  );

  const script = `
    import fs from 'node:fs';
    import { activateHostAfterLogin } from './src/commands/auth.ts';
    activateHostAfterLogin('https://other.example.com', 'https://other.example.com');
    const saved = JSON.parse(fs.readFileSync(${JSON.stringify(configFile)}, 'utf8'));
    if (saved.activeHost !== 'https://other.example.com') process.exit(2);
  `;

  try {
    const { status, stderr } = runInIsolatedHome(home, script);
    assert.equal(status, 0, stderr);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('activateHostAfterLogin: no-op without explicit --host', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-auth-host-'));
  const configDir = path.join(home, '.ae-cli');
  fs.mkdirSync(configDir, { recursive: true });
  const configFile = path.join(configDir, 'config.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      activeHost: 'https://old.example.com',
      hosts: { 'https://old.example.com': { label: 'old' } },
    }),
  );

  const script = `
    import fs from 'node:fs';
    import { activateHostAfterLogin } from './src/commands/auth.ts';
    activateHostAfterLogin('https://old.example.com', undefined);
    const saved = JSON.parse(fs.readFileSync(${JSON.stringify(configFile)}, 'utf8'));
    if (saved.activeHost !== 'https://old.example.com') process.exit(2);
  `;

  try {
    const { status, stderr } = runInIsolatedHome(home, script);
    assert.equal(status, 0, stderr);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth workbuddy-host-page emits loopback URL, saves selection, and exits', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-workbuddy-host-page-'));
  try {
    fs.mkdirSync(path.join(home, '.ae-cli'), { recursive: true });
    fs.writeFileSync(path.join(home, '.ae-cli', 'config.json'), JSON.stringify({
      activeHost: 'https://terminal.example.com',
      hosts: { 'https://terminal.example.com': { label: 'terminal.example.com' } },
    }));
    const result = await runWorkBuddyHostSelection(home);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /\shttp:\/\/127\.0\.0\.1:\d+\/workbuddy\/[A-Za-z0-9_-]+\/\s/);

    const workBuddyConfig = JSON.parse(fs.readFileSync(path.join(home, '.ae-cli-workbuddy', 'config.json'), 'utf8'));
    assert.equal(workBuddyConfig.activeHost, 'https://selected.example.com');
    assert.deepEqual(workBuddyConfig.hosts['https://selected.example.com'], {
      label: 'selected.example.com',
    });
    const terminalConfig = JSON.parse(fs.readFileSync(path.join(home, '.ae-cli', 'config.json'), 'utf8'));
    assert.equal(terminalConfig.activeHost, 'https://terminal.example.com');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth status in the WorkBuddy config directory ignores default CLI and sandbox state', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-workbuddy-status-'));
  try {
    fs.mkdirSync(path.join(home, '.ae-cli'), { recursive: true });
    fs.writeFileSync(path.join(home, '.ae-cli', 'config.json'), JSON.stringify({
      activeHost: 'https://terminal.example.com',
      hosts: { 'https://terminal.example.com': { label: 'terminal.example.com' } },
    }));
    fs.mkdirSync(path.join(home, '.ae-cli-workbuddy'), { recursive: true });
    fs.writeFileSync(path.join(home, '.ae-cli-workbuddy', 'config.json'), JSON.stringify({
      activeHost: 'https://selected.example.com',
      hosts: { 'https://selected.example.com': { label: 'selected.example.com' } },
    }));
    fs.mkdirSync(path.join(home, '.ae-config'), { recursive: true });
    fs.writeFileSync(path.join(home, '.ae-config', 'cli-token.json'), JSON.stringify({
      url: 'http://localhost:18992',
      token: 'sandbox-token',
    }));

    const script = `
      import { registerAuth } from './src/commands/auth.ts';
      import { Command } from 'commander';
      const program = new Command();
      program.exitOverride();
      registerAuth(program);
      await program.parseAsync(['node', 'test', 'auth', 'status']);
    `;
    const result = runInIsolatedHome(home, script, {
      AE_CLI_CONFIG_DIR: '${HOME}/.ae-cli-workbuddy',
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.authenticated, false);
    assert.equal(output.data.host, 'https://selected.example.com');
    assert.equal(output.data.source, 'none');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('auth login --no-browser uses the isolated WorkBuddy host and credential store', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-workbuddy-auth-'));
  try {
    fs.mkdirSync(path.join(home, '.ae-cli-workbuddy'), { recursive: true });
    fs.writeFileSync(path.join(home, '.ae-cli-workbuddy', 'config.json'), JSON.stringify({
      activeHost: 'https://ta.example.com',
      hosts: { 'https://ta.example.com': { label: 'ta.example.com' } },
    }));
    const result = runWorkBuddyLogin(home);
    const expectedUrl = 'https://ta.example.com/agent/device-activate?user_code=WB-123';
    const urlIndex = result.stderr.indexOf(expectedUrl);

    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.elapsedMs < 10000, `command took ${result.elapsedMs}ms`);
    assert.ok(urlIndex >= 0, 'complete HTTPS verification URL was not emitted');
    assert.match(result.stderr[urlIndex - 1] ?? '', /\s/);
    assert.match(result.stderr[urlIndex + expectedUrl.length] ?? '', /\s/);
    assert.notEqual(result.stderr[urlIndex - 1], '"');
    assert.notEqual(result.stderr[urlIndex - 1], '<');
    assert.notEqual(result.stderr[urlIndex + expectedUrl.length], '"');
    assert.notEqual(result.stderr[urlIndex + expectedUrl.length], '>');
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.authenticated, true);
    assert.equal(output.data.host, 'https://ta.example.com');
    assert.equal(fs.existsSync(path.join(home, '.ae-cli-workbuddy', 'secure-tokens')), true);
    assert.equal(fs.existsSync(path.join(home, '.ae-cli', 'secure-tokens')), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
