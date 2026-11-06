import { Command as CommanderCommand, Option } from 'commander';
import { createRequire } from 'node:module';

import commands from './commands/ai-monitor/index.js';
import { registerStandaloneAiMonitorCommands } from './commands/ai-monitor/register.js';
import { readExternalCliToken, setExternalCliTokenFile } from './core/external-cli-token.js';
import { configureBusinessCommands } from './framework/business-filter.js';
import { parseProgram } from './framework/program-lifecycle.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new CommanderCommand();
program
  .name('ai-monitor')
  .version(version)
  .description('AI Monitor read commands provided by @tant/ae-cli')
  .option('--host <url>', 'Override active AE host URL')
  .option('--cli-token-file <path>', 'Use a read-only JSON CLI token file containing url and token for this invocation')
  .option('--format <format>', 'Output format: json | table', 'json')
  .option('--jq <expr>', 'jq 1.8 filter over command payload')
  .option('--validate', 'Validate and normalize capability input without executing it', false)
  .option('--dry-run', 'Validate authentication, permission, and data scope without executing the read capability', false)
  .option('--yes', 'Skip confirmation for high-risk write operations', false);

program.addOption(
  new Option('--agent-context <base64url-json>', 'Internal agent context payload for gateway telemetry').hideHelp(),
);

program.hook('preAction', (_root, actionCommand) => {
  const rootOptions = program.opts();
  setExternalCliTokenFile(rootOptions.cliTokenFile);
  // Match the standalone command runner's local-host precedence before reading credentials.
  readExternalCliToken(actionCommand.opts().host ?? rootOptions.host);
});

registerStandaloneAiMonitorCommands(program, commands);
const args = process.argv.slice(2);
// Help reads the same selected credential identity without requiring authentication or a request.
setExternalCliTokenFile(globalOptionValue(args, '--cli-token-file'));
configureBusinessCommands(program, { commandPrefix: ['ai-monitor'], hostOverride: globalOptionValue(args, '--host') });
await parseProgram(program);

function globalOptionValue(args: string[], name: string): string | undefined {
  let value: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    if (token === '--') break;
    const option = program.options.find(candidate => candidate.long === token || candidate.short === token);
    if (option?.required) {
      const next = args[index + 1];
      // Leave missing-value errors to Commander's existing parser and renderer.
      if (next === undefined) break;
      if (token === name) value = next;
      index++;
    } else if (token.startsWith(`${name}=`)) value = token.slice(name.length + 1);
  }
  return value;
}
