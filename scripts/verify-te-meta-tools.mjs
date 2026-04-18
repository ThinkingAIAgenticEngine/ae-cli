import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const commandsDir = path.join(ROOT, 'src/commands/te-meta');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const commandFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (entry.name === 'index.ts' || entry.name === 'shared.ts') continue;
    commandFiles.push(p);
  }
}

walk(commandsDir);

const commands = [];
for (const file of commandFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const match = content.match(/command:\s*'\+([a-z0-9_]+)'/);
  if (!match) {
    fail(`cannot parse command from ${path.relative(ROOT, file)}`);
  }
  commands.push(match[1]);
}

const commandSet = new Set(commands);
if (commandSet.size !== commands.length) {
  fail('duplicate te_meta command names found in source files');
}

const EXPECTED_COUNT = 20;
if (commands.length !== EXPECTED_COUNT) {
  fail(`te_meta tool count mismatch: expected ${EXPECTED_COUNT}, got ${commands.length}`);
}

const help = spawnSync('npx', ['tsx', 'src/index.ts', 'te_meta', '--help'], {
  cwd: ROOT,
  encoding: 'utf-8',
});

if (help.status !== 0) {
  process.stderr.write(help.stderr || '');
  fail('failed to run te_meta --help');
}

for (const tool of commands) {
  const token = `+${tool}`;
  if (!help.stdout.includes(token)) {
    fail(`help output missing command: ${token}`);
  }
}

console.log(`OK: verified ${commands.length} te_meta tools are registered and aligned.`);
