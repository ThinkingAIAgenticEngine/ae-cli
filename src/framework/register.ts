import { Command as CommanderCommand } from 'commander';
import type { Command, Flag, GlobalOptions } from './types.js';
import { runCommand } from './runner.js';

export function registerCommands(program: CommanderCommand, commands: Command[]): void {
  // Group commands by service
  const byService = new Map<string, Command[]>();
  for (const cmd of commands) {
    const list = byService.get(cmd.service) || [];
    list.push(cmd);
    byService.set(cmd.service, list);
  }

  for (const [service, cmds] of byService) {
    // Find or create service command
    let serviceCmd = program.commands.find(c => c.name() === service);
    if (!serviceCmd) {
      serviceCmd = program.command(service).description(`${service} domain commands`);
    }

    for (const cmd of cmds) {
      const sub = serviceCmd.command(cmd.command).description(cmd.description);

      // Register flags
      for (const flag of cmd.flags) {
        const flagStr = buildFlagString(flag);
        if (flag.type === 'boolean') {
          sub.option(flagStr, flag.desc, (value: string | undefined) => parseBooleanValue(value, flag.name));
        } else if (flag.default !== undefined) {
          sub.option(flagStr, flag.desc, String(flag.default));
        } else {
          sub.option(flagStr, flag.desc);
        }
      }

      // Wire action
      sub.action(async (opts: Record<string, any>) => {
        const globalOpts = extractGlobalOptions(program);
        await runCommand(cmd, opts, globalOpts);
      });
    }
  }
}

function buildFlagString(flag: Flag): string {
  const long = `--${flag.name}`;
  const short = flag.alias ? `-${flag.alias}, ` : '';
  if (flag.type === 'boolean') {
    return `${short}${long} [value]`;
  }
  return `${short}${long} <value>`;
}

function parseBooleanValue(value: string | undefined, flagName: string): boolean {
  if (value === undefined) {
    return true;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y' || normalized === 'on') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n' || normalized === 'off') {
    return false;
  }

  throw new Error(`Invalid boolean for --${flagName}: ${value}. Use true/false.`);
}

function extractGlobalOptions(program: CommanderCommand): GlobalOptions {
  const opts = program.opts();
  return {
    host: opts.host,
    mcpUrl: opts.mcpUrl,
    format: opts.format || 'json',
    jq: opts.jq,
    dryRun: opts.dryRun || false,
    yes: opts.yes || false,
  };
}
