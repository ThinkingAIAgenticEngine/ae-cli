#!/usr/bin/env node

/**
 * verify-agent-tools.mjs
 *
 * Verify all commands under src/commands/te-agent/:
 * 1. Scan .ts files and extract command names via regex
 * 2. Duplicate check
 * 3. Count check (EXPECTED_COUNT = 15)
 * 4. Run ae-cli agent --help and verify all command names appear
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';

const AGENT_DIR = 'src/commands/te-agent';
const EXPECTED_COUNT = 15;
const SERVICE = 'agent';

let failed = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

// ─── Step 1: Scan command files ──────────────────────────────

function scanCommands(dir) {
  const commands = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      commands.push(...scanCommands(full));
      continue;
    }
    if (!entry.endsWith('.ts') || entry === 'index.ts') continue;

    const content = readFileSync(full, 'utf8');
    const re = /command:\s*'(\+[a-z][a-z0-9-]*)'/g;
    let match;
    while ((match = re.exec(content)) !== null) {
      commands.push({ name: match[1], file: full });
    }
  }
  return commands;
}

const commands = scanCommands(AGENT_DIR);
ok(`Found ${commands.length} commands`);

// ─── Step 2: Duplicate check ─────────────────────────────────

const names = commands.map((c) => c.name);
const uniqueNames = new Set(names);
if (uniqueNames.size !== names.length) {
  const seen = new Set();
  for (const n of names) {
    if (seen.has(n)) fail(`Duplicate command name: ${n}`);
    seen.add(n);
  }
} else {
  ok('No duplicate command names');
}

// ─── Step 3: Count check ─────────────────────────────────────

if (uniqueNames.size !== EXPECTED_COUNT) {
  fail(`Expected ${EXPECTED_COUNT} commands, found ${uniqueNames.size}`);
} else {
  ok(`Command count ${uniqueNames.size} = ${EXPECTED_COUNT}`);
}

// ─── Step 4: --help output verification ──────────────────────

try {
  const helpOutput = execSync(`npx tsx src/index.ts ${SERVICE} --help`, {
    encoding: 'utf8',
    timeout: 30000,
  });

  let allFound = true;
  for (const name of uniqueNames) {
    if (!helpOutput.includes(name)) {
      fail(`Command missing from --help output: ${name}`);
      allFound = false;
    }
  }
  if (allFound) {
    ok(`--help output contains all ${uniqueNames.size} commands`);
  }
} catch (err) {
  fail(`Failed to run --help: ${err.message}`);
}

// ─── Summary ─────────────────────────────────────────────────

if (failed) {
  console.error('\n✗ Verification failed');
  process.exit(1);
} else {
  console.log(`\n✓ All checks passed (${uniqueNames.size} commands)`);
}
