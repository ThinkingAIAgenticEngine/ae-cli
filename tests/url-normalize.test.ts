/**
 * URL normalization for ae-cli config hosts
 *
 * Run: npx tsx tests/url-normalize.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

function runInIsolatedHome(home: string, script: string): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: home },
    encoding: 'utf8',
  });
  return { status: result.status, stderr: result.stderr || '', stdout: result.stdout || '' };
}

process.stdout.write('\nurl-normalize tests\n');

await test('normalizeUrl: strips trailing slash and adds https', async () => {
  const { normalizeUrl } = await import('../src/core/url-utils.ts');
  assert.equal(normalizeUrl('https://ta.example.com/'), 'https://ta.example.com');
  assert.equal(normalizeUrl('ta.example.com'), 'https://ta.example.com');
});

await test('resolveHost: normalizes --host override', async () => {
  const { resolveHost } = await import('../src/core/auth.ts');
  assert.equal(resolveHost('https://ta.example.com/'), 'https://ta.example.com');
});

await test('loadConfig: dedupes trailing-slash duplicate hosts on read', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-url-norm-'));
  const configDir = path.join(home, '.ae-cli');
  fs.mkdirSync(configDir, { recursive: true });
  const configFile = path.join(configDir, 'config.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      activeHost: 'https://ta.example.com/',
      hosts: {
        'https://ta.example.com/': { label: 'with-slash' },
        'https://ta.example.com': { label: 'no-slash' },
        'https://other.example.com': { label: 'other' },
      },
    }),
  );

  const script = `
    import fs from 'node:fs';
    import { loadConfig } from './src/core/config.ts';
    const config = loadConfig();
    const keys = Object.keys(config.hosts).sort();
    if (config.activeHost !== 'https://ta.example.com') process.exit(2);
    if (keys.length !== 2) process.exit(3);
    if (!keys.includes('https://ta.example.com')) process.exit(4);
    if (!keys.includes('https://other.example.com')) process.exit(5);
    const saved = JSON.parse(fs.readFileSync(${JSON.stringify(configFile)}, 'utf8'));
    if (Object.keys(saved.hosts).length !== 2) process.exit(6);
  `;

  try {
    const { status, stderr } = runInIsolatedHome(home, script);
    assert.equal(status, 0, stderr);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

await test('activateHostAfterLogin: normalizes trailing slash', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-url-norm-'));
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
    activateHostAfterLogin('https://new.example.com/', 'https://new.example.com/');
    const saved = JSON.parse(fs.readFileSync(${JSON.stringify(configFile)}, 'utf8'));
    if (saved.activeHost !== 'https://new.example.com') process.exit(2);
    if (!saved.hosts['https://new.example.com']) process.exit(3);
    if (saved.hosts['https://new.example.com/']) process.exit(4);
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
