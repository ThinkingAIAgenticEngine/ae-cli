/**
 * auth login host resolution tests
 *
 * Run: npx tsx tests/auth-login-host.test.ts
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

function runInIsolatedHome(home: string, script: string): { status: number | null; stderr: string } {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
  });
  return { status: result.status, stderr: result.stderr || '' };
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

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
