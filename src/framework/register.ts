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
      serviceCmd.allowExcessArguments(false);
    }

    for (const cmd of cmds) {
      let parent = serviceCmd;
      if (cmd.resource) {
        for (const resource of cmd.resource.split(/\s+/).filter(Boolean)) {
          let resourceCmd = parent.commands.find(c => c.name() === resource);
          if (!resourceCmd) {
            resourceCmd = parent.command(resource).description(`${resource} commands`);
            resourceCmd.allowExcessArguments(false);
          }
          parent = resourceCmd;
        }
      }

      const sub = parent.command(cmd.command).description(cmd.description);

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

      // Most subcommands accept a local host override; stable data-plane commands may opt out.
      if (cmd.usesAeHost !== false) {
        sub.option('--host <url>', 'Override active AE host URL for this command');
      }
      sub.option('--format <format>', 'Output format: json | table. Default: json.');
      sub.option('--jq <expr>', 'jq 1.8 filter over command payload, applied before output envelope wrapping.');

      if (cmd.helpText) {
        sub.addHelpText('after', `\n${cmd.helpText}\n`);
      }

      // Wire action
      sub.action(async (opts: Record<string, any>) => {
        const globalOpts = extractGlobalOptions(program);
        if (opts.host) globalOpts.host = opts.host;
        if (opts.format) globalOpts.format = opts.format;
        if (opts.jq) globalOpts.jq = opts.jq;
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

function parseBooleanValue(value: string | undefined, flagName: string): boolean | string {
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

  // Return the raw value unchanged; the runner validates boolean flags and emits a unified
  // JSON validation error. Throwing here escapes commander as an uncaught Node stack trace.
  return value;
}

function extractGlobalOptions(program: CommanderCommand): GlobalOptions {
  const opts = program.opts();
  return {
    host: opts.host,
    mcpUrl: opts.mcpUrl,
    format: opts.format || 'json',
    jq: opts.jq,
    validate: opts.validate || false,
    dryRun: opts.dryRun || false,
    yes: opts.yes || false,
  };
}
