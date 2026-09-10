import { Command as CommanderCommand } from 'commander';
import { createRequire } from 'module';
import { registerCommands } from './framework/register.js';
import type { Command } from './framework/types.js';
import { runHostCompatCheck } from './core/compat-check.js';
import { getLocalCliPackageInfo } from './core/package-info.js';
import { registerTracking } from './commands/tracking/index.js';
import { parseProgram } from './framework/program-lifecycle.js';
import { printError } from './framework/output.js';

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
  .option('--jq <expr>', 'jq 1.8 filter over command payload (via jq-wasm), applied before output envelope')
  .option(
    '--validate',
    'Optional: validate/normalize capability input only (gateway /validate). Use alone while fixing complex params/qp; do not stack with --dry-run',
    false,
  )
  .option(
    '--dry-run',
    'Optional: pre-execution preview without business logic (gateway /dry-run; other transports preview). Use alone to confirm a run; do not stack with --validate',
    false,
  )
  .option('--yes', 'Skip confirmation for high-risk write operations', false)
  .option('--no-update-check', 'Skip host compatibility checks', false);

// Import domain commands
async function loadCommands(): Promise<Command[]> {
  const commands: Command[] = [];
  try {
    const teAnalysis = await import('./commands/te-analysis/index.js');
    commands.push(...teAnalysis.default);
  } catch {}
  try {
    const engage = await import('./commands/te-engage/index.js');
    commands.push(...engage.default);
  } catch {}
  try {
    const experiment = await import('./commands/te-experiment/index.js');
    commands.push(...experiment.default);
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
  try {
    const memory = await import('./commands/memory/index.js');
    commands.push(...memory.default);
  } catch {}
  try {
    const teSystem = await import('./commands/te-system/index.js');
    commands.push(...teSystem.default);
  } catch {}
  try {
    const metadata = await import('./commands/metadata/index.js');
    commands.push(...metadata.default);
  } catch {}
  try {
    const projectSemantic = await import('./commands/project-semantic/index.js');
    commands.push(...projectSemantic.default);
  } catch {}
  try {
    const personalSemanticPreference = await import('./commands/personal-semantic-preference/index.js');
    commands.push(...personalSemanticPreference.default);
  } catch {}
  try {
    const dataIntegration = await import('./commands/data-integration/index.js');
    commands.push(...dataIntegration.default);
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

async function registerCapabilityCommands(): Promise<void> {
  try {
    const { registerCapability } = await import('./commands/capability/index.js');
    registerCapability(program);
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

async function registerUpdateCommand(): Promise<void> {
  try {
    const { registerUpdate } = await import('./commands/update.js');
    registerUpdate(program);
  } catch {}
}

async function main() {
  const pkgInfo = getLocalCliPackageInfo();
  if (!isRootUpdateCommand(process.argv.slice(2))) {
    const compat = await runHostCompatCheck(
      pkgInfo,
      globalOptionValue(process.argv.slice(2), '--host'),
    );
    if (compat.status === 'synced') {
      const message =
        compat.direction === 'skills'
          ? `Skills were synchronized for ae-cli ${compat.expected}.`
          : `ae-cli changed from ${compat.current} to ${compat.expected} for this host.`;
      printError(
        'config',
        message,
        'Re-run the previous command to use the synchronized CLI and Skills.',
        'AE_CLI_VERSION_SYNCED',
        {
          current: compat.current,
          expected: compat.expected,
          cluster: compat.cluster,
          direction: compat.direction,
          retryOriginalCommand: true,
        },
        { log: false },
      );
      process.exitCode = 1;
      return;
    }
  }

  const commands = await loadCommands();
  registerCommands(program, commands);
  await registerAuthCommands();
  await registerConfigCommands();
  await registerCapabilityCommands();
  await registerSyncCommand();
  await registerModelCommand();
  await registerUpdateCommand();
  registerTracking(program);
  rejectUnknownHelpCommandPath(program, process.argv.slice(2));
  await parseProgram(program);
}

await main();

function rejectUnknownHelpCommandPath(root: CommanderCommand, args: string[]): void {
  if (!args.includes('--help') && !args.includes('-h')) {
    return;
  }

  let current = root;
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--' || token === '--help' || token === '-h') {
      return;
    }
    if (token.startsWith('-')) {
      if (optionConsumesValue(token)) {
        i += 1;
      }
      continue;
    }

    const child = current.commands.find((cmd) => cmd.name() === token || cmd.aliases().includes(token));
    if (child) {
      current = child;
      continue;
    }

    if (current.commands.length > 0) {
      process.stderr.write(`error: unknown command '${token}'\n`);
      process.exit(1);
    }
  }
}

function optionConsumesValue(token: string): boolean {
  if (token.includes('=')) {
    return false;
  }
  return token === '--host'
    || token === '--mcp-url'
    || token === '--format'
    || token === '--jq';
}

function globalOptionValue(args: string[], option: string): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === option) return args[i + 1];
    if (token.startsWith(`${option}=`)) return token.slice(option.length + 1);
  }
  return undefined;
}

function isRootUpdateCommand(args: string[]): boolean {
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--') return false;
    if (token.startsWith('-')) {
      if (optionConsumesValue(token)) {
        i += 1;
      }
      continue;
    }
    return token === 'update';
  }
  return false;
}
