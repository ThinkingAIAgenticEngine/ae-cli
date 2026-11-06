import { Command as CommanderCommand } from 'commander';

import type { Command, Flag, GlobalOptions } from '../../framework/types.js';
import { runCommand } from '../../framework/runner.js';

/** Register the AI Monitor command tree directly under the standalone ai-monitor binary. */
export function registerStandaloneAiMonitorCommands(
  program: CommanderCommand,
  commands: Command[],
): void {
  for (const command of commands) {
    let parent = program;
    for (const resource of (command.resource || '').split(/\s+/).filter(Boolean)) {
      let resourceCommand = parent.commands.find((candidate) => candidate.name() === resource);
      if (!resourceCommand) {
        resourceCommand = parent.command(resource).description(`${resource} commands`);
        resourceCommand.allowExcessArguments(false);
      }
      parent = resourceCommand;
    }

    const actionCommand = parent
      .command(command.command, { hidden: command.hidden === true })
      .description(command.description);

    for (const flag of command.flags) {
      const declaration = flagDeclaration(flag);
      if (flag.variadic) {
        actionCommand.option(declaration, flag.desc, collectVariadic, []);
      } else if (flag.type === 'boolean') {
        actionCommand.option(
          declaration,
          flag.desc,
          (value: string | undefined) => parseBooleanValue(value),
        );
      } else if (flag.default !== undefined) {
        actionCommand.option(declaration, flag.desc, String(flag.default));
      } else {
        actionCommand.option(declaration, flag.desc);
      }
    }

    if (command.usesAeHost !== false) {
      actionCommand.option('--host <url>', 'Override active AE host URL for this command');
    }
    actionCommand.option('--format <format>', 'Output format: json | table. Default: json.');
    actionCommand.option('--jq <expr>', 'jq 1.8 filter over command payload, applied before output envelope wrapping.');

    if (command.helpText) {
      actionCommand.addHelpText('after', `\n${command.helpText}\n`);
    }

    actionCommand.action(async (options: Record<string, unknown>) => {
      const globalOptions = standaloneGlobalOptions(program, options);
      await runCommand(command, options, globalOptions);
    });
  }
}

function flagDeclaration(flag: Flag): string {
  const long = `--${flag.name}`;
  const short = flag.alias ? `-${flag.alias}, ` : '';
  return flag.type === 'boolean'
    ? `${short}${long} [value]`
    : `${short}${long} <value>`;
}

function collectVariadic(value: string, previous: string[] | undefined): string[] {
  return (previous ?? []).concat(value);
}

function parseBooleanValue(value: string | undefined): boolean | string {
  if (value === undefined) return true;
  const normalized = value.toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return value;
}

function standaloneGlobalOptions(
  program: CommanderCommand,
  localOptions: Record<string, unknown>,
): GlobalOptions {
  const root = program.opts();
  return {
    host: typeof localOptions.host === 'string' ? localOptions.host : root.host,
    mcpUrl: root.mcpUrl,
    format: (typeof localOptions.format === 'string' ? localOptions.format : root.format) || 'json',
    jq: typeof localOptions.jq === 'string' ? localOptions.jq : root.jq,
    validate: root.validate || false,
    dryRun: root.dryRun || false,
    yes: root.yes || false,
  };
}
