import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const commandsDir = path.join(ROOT, 'src/commands/evaluation');

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
  const match = content.match(/command:\s*["']([+a-z0-9_-]+)["']/);
  if (!match) {
    fail(`cannot parse command from ${path.relative(ROOT, file)}`);
  }
  const resource = content.match(/resource:\s*["']([^"']+)["']/)?.[1] || '';
  commands.push({ command: match[1], resource });
}

const commandSet = new Set(commands.map(({ resource, command }) => `${resource} ${command}`));
if (commandSet.size !== commands.length) {
  fail('duplicate evaluation command names found in source files');
}

const sharedSource = fs.readFileSync(path.join(commandsDir, 'shared.ts'), 'utf-8');
if (!sharedSource.includes("export const EVAL_API_PREFIX = '/agenteval/api/v1';")) {
  fail('EVAL_API_PREFIX must be /agenteval/api/v1 (server mounts routes under /agenteval/api/v1)');
}
for (const file of commandFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (!content.includes("from './shared.js'")) {
    fail(`evaluation command does not use the shared transport: ${path.relative(ROOT, file)}`);
  }
}

function runCliHelp(resource) {
  const outputPath = path.join(tmpdir(), `ae-cli-evaluation-help-${process.pid}.txt`);
  let outputFd;
  try {
    // File-backed stdout avoids truncation when Commander exits after large help output.
    outputFd = fs.openSync(outputPath, 'w');
    const help = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', 'evaluation', ...resource.split(' ').filter(Boolean), '--help'], {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', outputFd, 'pipe'],
    });
    return { status: help.status, stderr: help.stderr, stdout: fs.readFileSync(outputPath, 'utf8') };
  } finally {
    if (outputFd !== undefined) fs.closeSync(outputFd);
    fs.rmSync(outputPath, { force: true });
  }
}

const helpByResource = new Map();
for (const { command, resource } of commands) {
  if (!helpByResource.has(resource)) {
    const help = runCliHelp(resource);
    if (help.status !== 0) {
      process.stderr.write(help.stderr || '');
      fail(`failed to run evaluation ${resource} --help`);
    }
    helpByResource.set(resource, help.stdout);
  }
  if (!helpByResource.get(resource).includes(command)) fail(`help output missing command: ${resource} ${command}`);
}

console.log(`OK: verified ${commands.length} evaluation tools are registered; API coverage is checked by the contract suite.`);
