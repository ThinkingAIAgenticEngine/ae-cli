#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SYSTEM_DIR = 'src/commands/te-system';
const EXPECTED_COMMANDS = [
  '+list-member-candidates',
  '+list-members',
  '+add-members',
  '+set-member-status',
  '+set-member-role',
  '+remove-member',
  '+list-sandboxes',
  '+batch-create-sandboxes',
  '+update-sandbox',
  '+set-sandbox-enabled',
  '+start-sandbox',
  '+stop-sandbox',
  '+list-sandbox-users',
  '+bind-sandbox-user',
  '+unbind-sandbox-user',
  '+remove-sandbox',
  '+list-system-models',
  '+set-system-model-enabled',
  '+list-company-models',
  '+set-company-model-enabled',
  '+get-default-models',
  '+set-default-model',
  '+clear-default-model',
  '+get-usage-summary',
  '+get-usage-details',
  '+get-cost-summary',
  '+get-balance-alert',
  '+set-balance-alert',
  '+list-quota-rules',
  '+create-quota-rule',
  '+update-quota-rule',
  '+remove-quota-rule',
  '+bind-quota-rule-user',
  '+list-channels',
  '+create-channel',
  '+update-channel',
  '+remove-channel',
  '+upload-sandbox-tool',
  '+npm-install',
];

let failed = false;

function fail(message) {
  failed = true;
  process.stderr.write(`✗ ${message}\n`);
}

function ok(message) {
  process.stdout.write(`✓ ${message}\n`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const file = join(dir, entry);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

const discovered = [];
for (const file of walk(SYSTEM_DIR).filter((entry) => entry.endsWith('.ts'))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/command:\s*['"](\+[a-z][a-z0-9-]*)['"]/g)) {
    discovered.push({ name: match[1], file });
  }
}

const names = discovered.map((entry) => entry.name);
const uniqueNames = new Set(names);
if (uniqueNames.size !== names.length) {
  const seen = new Set();
  for (const entry of discovered) {
    if (seen.has(entry.name)) fail(`Duplicate command ${entry.name} in ${entry.file}`);
    seen.add(entry.name);
  }
} else {
  ok('System command names are unique');
}

const missing = EXPECTED_COMMANDS.filter((name) => !uniqueNames.has(name));
const unexpected = names.filter((name) => !EXPECTED_COMMANDS.includes(name));
if (missing.length || unexpected.length) {
  if (missing.length) fail(`Missing commands: ${missing.join(', ')}`);
  if (unexpected.length) fail(`Unexpected commands: ${unexpected.join(', ')}`);
} else {
  ok(`System command set matches the expected ${EXPECTED_COMMANDS.length} commands`);
}

const sharedSource = readFileSync(join(SYSTEM_DIR, 'shared.ts'), 'utf8');
if (
  !sharedSource.includes("path.startsWith('/api/admin/')")
  || !sharedSource.includes('assertAdminPath(request.path)')
) {
  fail('Shared system transport must reject non-/api/admin paths');
} else {
  ok('System transport enforces the /api/admin boundary');
}

const skillSource = readFileSync('skills/ae-system/SKILL.md', 'utf8');
if (
  !skillSource.includes('`root` or `agent_admin`')
  || !skillSource.includes('HTTP 403')
  || !skillSource.includes('Do not retry')
) {
  fail('ae-system must document the admin-only permission boundary and 403 behavior');
} else {
  ok('ae-system documents the root/agent_admin permission boundary');
}

function runCli(args) {
  return execFileSync(
    'npx',
    ['tsx', 'src/index.ts', '--no-update-check', ...args],
    { encoding: 'utf8', timeout: 30_000 },
  );
}

try {
  const help = runCli(['system', '--help']);
  const missingFromHelp = EXPECTED_COMMANDS.filter((name) => !help.includes(name));
  if (missingFromHelp.length) {
    fail(`Commands missing from system --help: ${missingFromHelp.join(', ')}`);
  } else {
    ok('system --help exposes all expected commands');
  }
} catch (error) {
  fail(`Unable to run system --help: ${error instanceof Error ? error.message : String(error)}`);
}

const dryRuns = [
  ['system', '+list-members', '--status', 'enabled', '--page', '1'],
  ['system', '+batch-create-sandboxes', '--user-ids', '["user-1"]'],
  ['system', '+set-default-model', '--model-id', 'model-1'],
  [
    'system',
    '+get-usage-details',
    '--start-date',
    '2026-07-01',
    '--end-date',
    '2026-07-24',
  ],
  ['system', '+set-balance-alert', '--enabled', 'true', '--threshold', '100'],
  [
    'system',
    '+create-channel',
    '--channel',
    '{"name":"Ops","type":"slack","config":{"botToken":"secret","appToken":"secret-2"}}',
  ],
  ['system', '+upload-sandbox-tool', '--path', '/tmp/example-tool'],
  ['system', '+npm-install', '--package', 'eslint@9.32.0'],
];

for (const args of dryRuns) {
  const commandName = args[1];
  try {
    const envelope = JSON.parse(runCli(['--dry-run', ...args]));
    const preview = envelope.data;
    if (!preview || !String(preview.url).startsWith('/api/admin/')) {
      fail(`${commandName} dry-run escaped the /api/admin boundary`);
      continue;
    }
    if (commandName === '+create-channel') {
      if (
        preview.body?.config?.botToken !== '***'
        || preview.body?.config?.appToken !== '***'
        || JSON.stringify(preview).includes('"secret"')
      ) {
        fail('+create-channel dry-run exposed channel credentials');
        continue;
      }
    }
    ok(`${commandName} dry-run contract is valid`);
  } catch (error) {
    fail(`${commandName} dry-run failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
