import { Command as CommanderCommand } from 'commander';
import { createRequire } from 'module';
import { registerCommands } from './framework/register.js';
import type { Command } from './framework/types.js';
import { notifyIfUpdateAvailable } from './core/update-check.js';
import { registerTracking } from './commands/tracking/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const { version } = pkg;

const program = new CommanderCommand();

program
  .name('ae-cli')
  .version(version)
  .description('CLI tool for ThinkingAI (AE) analytics platform')
  .option('--host <url>', 'Override active AE host URL (e.g., https://ta.thinkingdata.cn)')
  .option('--mcp-url <url>', 'Override MCP server URL (e.g., http://localhost/mcp/http/example)')
  .option('--format <format>', 'Output format: json | table', 'json')
  .option('--jq <expr>', 'jq filter expression')
  .option('--dry-run', 'Show request details without executing', false)
  .option('--yes', 'Skip confirmation for write operations', false)
  .option('--no-update-check', 'Skip checking for newer ae-cli versions', false);

// Import domain commands
async function loadCommands(): Promise<Command[]> {
  const commands: Command[] = [];
  try {
    const teAnalysis = await import('./commands/te-analysis/index.js');
    commands.push(...teAnalysis.default);
  } catch {}
  try {
    const teAudience = await import('./commands/te-audience/index.js');
    commands.push(...teAudience.default);
  } catch {}
  try {
    const teMeta = await import('./commands/te-meta/index.js');
    commands.push(...teMeta.default);
  } catch {}
  try {
    const teCommon = await import('./commands/te-common/index.js');
    commands.push(...teCommon.default);
  } catch {}
  try {
    const engage = await import('./commands/te-engage/index.js');
    commands.push(...engage.default);
  } catch {}
  try {
    const community = await import('./commands/te-community/index.js');
    commands.push(...community.default);
  } catch {}
  try {
    const dataops = await import('./commands/te-dataops/index.js');
    commands.push(...dataops.default);
  } catch {}
  try {
    const teKb = await import('./commands/te-kb/index.js');
    commands.push(...teKb.default);
  } catch {}
  try {
    const teTeam = await import('./commands/te-team/index.js');
    commands.push(...teTeam.default);
  } catch {}
  try {
    const teAgent = await import('./commands/te-agent/index.js');
    commands.push(...teAgent.default);
  } catch {}
  return commands;
}

// Register auth commands
async function registerAuthCommands(): Promise<void> {
  try {
    const { registerAuth } = await import('./commands/auth.js');
    registerAuth(program);
  } catch {}
}

// Register config commands
async function registerConfigCommands(): Promise<void> {
  try {
    const { registerConfig } = await import('./commands/config.js');
    registerConfig(program);
  } catch {}
}

// Register raw API command
async function registerApiCommand(): Promise<void> {
  try {
    const { registerApi } = await import('./api/raw.js');
    registerApi(program);
  } catch {}
}

// Register sync command (te-agent Skill / MCP push)
async function registerSyncCommand(): Promise<void> {
  try {
    const { registerSync } = await import('./commands/sync/index.js');
    registerSync(program);
  } catch {}
}

// Register model command (te-agent settings.json model switch)
async function registerModelCommand(): Promise<void> {
  try {
    const { registerModel } = await import('./commands/model/index.js');
    registerModel(program);
  } catch {}
}

async function main() {
  notifyIfUpdateAvailable({ name: pkg.name, version: pkg.version });

  const commands = await loadCommands();
  registerCommands(program, commands);
  await registerAuthCommands();
  await registerConfigCommands();
  await registerApiCommand();
  await registerSyncCommand();
  await registerModelCommand();
  registerTracking(program);
  program.parse();
}

main();
