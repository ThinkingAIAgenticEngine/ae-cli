import { Command, Help } from 'commander';
import { businessForCommand, type BusinessStates, type OptionalBusiness } from '../core/businesses.js';
import { assertBusinessEnabled, readCurrentBusinessConfig } from '../core/business-config.js';

function commandPath(command: Command): string[] {
  const result: string[] = [];
  for (let current: Command | null = command; current?.parent; current = current.parent) {
    result.unshift(current.name());
  }
  return result;
}

interface BusinessCommandOptions {
  hostOverride?: string;
  readStates?: () => BusinessStates;
  assertEnabled?: (business: OptionalBusiness | undefined, hostOverride?: string) => Promise<void>;
}

/** Keep every command registered while using the same policy for all help entry points. */
export function configureBusinessCommands(program: Command, options: BusinessCommandOptions = {}): void {
  const readStates = options.readStates ?? (() => readCurrentBusinessConfig(options.hostOverride));
  const isVisible = (command: Command): boolean => {
    const business = businessForCommand(commandPath(command));
    return !business || readStates()[business] !== false;
  };
  const helpConfiguration = {
    visibleCommands(this: Help, command: Command) {
      return Help.prototype.visibleCommands.call(this, command).filter(isVisible);
    },
    formatHelp(this: Help, command: Command, helper: Help) {
      if (!isVisible(command)) {
        const business = businessForCommand(commandPath(command));
        return `The '${business}' business is not enabled for the current environment.\n`
          + 'Run: ae-cli config refresh\n';
      }
      return Help.prototype.formatHelp.call(this, command, helper);
    },
  };
  const configureHelp = (command: Command): void => {
    command.configureHelp(helpConfiguration);
    command.commands.forEach(configureHelp);
  };
  configureHelp(program);
  program.on('beforeAllHelp', (context: { command: Command; write: (text: string) => void }) => {
    if (isVisible(context.command)) return;
    const business = businessForCommand(commandPath(context.command));
    context.write(`The '${business}' business is not enabled for the current environment.\nRun: ae-cli config refresh\n`);
    // Suppress command-specific examples as well as the built-in command help.
    context.write = () => {};
  });
  program.hook('preAction', async (_root, actionCommand) => {
    const business = businessForCommand(commandPath(actionCommand));
    if (!business) return;
    const opts = actionCommand.optsWithGlobals<{ host?: string }>();
    await (options.assertEnabled ?? assertBusinessEnabled)(business, opts.host ?? options.hostOverride);
  });
}
