import * as readline from 'node:readline';
import { Command } from 'commander';
import { resolveHost } from '../../core/auth.js';
import {
  CapabilityGatewayError,
  dryRunCapability,
  executeCapability,
  inspectCapability,
  listCapabilities,
  validateCapability,
} from '../../core/capability-api.js';
import { PermissionError } from '../../core/errors.js';
import { SecureStoreAuthError } from '../../core/secure-store.js';
import { printError, printOutput } from '../../framework/output.js';
import type { OutputFormat } from '../../framework/types.js';
import {
  CapabilityCommandValidationError,
  filterCapabilities,
  normalizeCapabilityList,
  parseCapabilityInput,
  parseOptionalProjectId,
  resolveCapabilityGatewayDomain,
  resolveCapabilityListDomain,
} from './helpers.js';
import { normalizeRiskLevel, requiresConfirmation } from '../../core/capability-risk.js';

type GlobalCapabilityOptions = {
  format?: OutputFormat;
  jq?: string;
  host?: string;
  yes?: boolean;
  dryRun?: boolean;
  validate?: boolean;
};

export function registerCapability(program: Command): void {
  const capability = program
    .command('capability')
    .description('Discover and invoke capability gateway operations')
    .action(() => {
      printError('validation', 'Missing subcommand.', 'Run: ae-cli capability --help');
      process.exitCode = 1;
    });

  capability
    .command('list')
    .description('List capability summaries in a domain')
    .requiredOption('--domain <domain>', 'Capability namespace, such as analysis or metadata')
    .option('--project-id <project-id>', 'Filter by project membership, permissions, and enabled features')
    .action(async (opts: { domain: string; projectId?: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = resolveCapabilityListDomain(opts.domain);
        const projectId = parseOptionalProjectId(opts.projectId);
        const catalog = normalizeCapabilityList(await listCapabilities(host, gatewayDomain, projectId));
        const capabilities = filterCapabilities(catalog, opts.domain);
        return { domain: opts.domain, count: capabilities.length, capabilities };
      });
    })
    .addHelpText(
      'after',
      '\nExamples:\n' +
      '  ae-cli capability list --domain analysis\n' +
      '  ae-cli capability list --domain analysis --project-id 1',
    );

  capability
    .command('search')
    .description('Search capability IDs and descriptions in a domain')
    .argument('<query>', 'Case-insensitive search terms')
    .requiredOption('--domain <domain>', 'Capability namespace, such as analysis or metadata')
    .option('--project-id <project-id>', 'Filter by project membership, permissions, and enabled features')
    .action(async (query: string, opts: { domain: string; projectId?: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = resolveCapabilityListDomain(opts.domain);
        const projectId = parseOptionalProjectId(opts.projectId);
        const catalog = normalizeCapabilityList(await listCapabilities(host, gatewayDomain, projectId));
        const capabilities = filterCapabilities(catalog, opts.domain, query);
        return { domain: opts.domain, query, count: capabilities.length, capabilities };
      });
    })
    .addHelpText(
      'after',
      '\nExamples:\n' +
      '  ae-cli capability search "dashboard list" --domain analysis\n' +
      '  ae-cli capability search "dashboard list" --domain analysis --project-id 1',
    );

  capability
    .command('inspect')
    .description('Inspect one capability schema, risk, auth, and output metadata')
    .argument('<capability-id>', 'Capability ID, such as analysis.report.list')
    .option('--domain <domain>', 'Override the capability namespace used for gateway routing')
    .option('--project-id <project-id>', 'Check availability in a project before returning metadata')
    .action(async (capabilityId: string, opts: { domain?: string; projectId?: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = resolveCapabilityGatewayDomain(capabilityId, opts.domain);
        return inspectCapability(host, gatewayDomain, capabilityId, parseOptionalProjectId(opts.projectId));
      });
    })
    .addHelpText(
      'after',
      '\nExamples:\n' +
      '  ae-cli capability inspect analysis.dashboard.list\n' +
      '  ae-cli capability inspect analysis.dashboard.list --project-id 1',
    );

  capability
    .command('validate')
    .description(
      'Validate and normalize capability input only (schema/params). Does not execute business logic. '
      + 'Use when crafting complex payloads (nested objects, qp, share/member payloads) before dry-run/run. '
      + 'Success data: valid, capability_id, normalized_input. '
      + 'Unlike dry-run, does not return risk/output_mode/supports_cancel preview.',
    )
    .argument('<capability-id>', 'Capability ID, such as metadata.data_table.sql_write')
    .option('--domain <domain>', 'Override the capability namespace used for gateway routing')
    .option('--input <json-or-path>', 'Input JSON object, file path, @<path>, or - for stdin')
    .action(async (capabilityId: string, opts: { domain?: string; input?: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = resolveCapabilityGatewayDomain(capabilityId, opts.domain);
        return validateCapability(host, gatewayDomain, capabilityId, parseCapabilityInput(opts.input));
      });
    })
    .addHelpText(
      'after',
      '\nWhen to use:\n' +
      '  Prefer validate while iterating complex input (required fields, types, qp shape), then run.\n' +
      '  Prefer dry-run alone when you need risk / output mode / cancelability or a delete gate.\n' +
      '  Motto: validate = fix params; dry-run = confirm ready to run.\n' +
      '  Do not stack validate + dry-run on the same final input by default (dry-run already validates params).\n' +
      '  Neither mutates business data. Curated gateway commands: global --validate / --dry-run.\n\n' +
      'Examples:\n' +
      '  ae-cli capability validate metadata.data_table.sql_write --input \'{"project_id":1,"operation":"create",...}\'\n' +
      '  ae-cli metadata data-table sql-write --project-id 1 ... --validate\n' +
      '  ae-cli capability validate analysis.project_space.create --input input.json',
    );

  capability
    .command('dry-run')
    .description(
      'Full pre-execution confirmation without running business logic: validates/normalizes input and returns '
      + 'risk, output_mode, and supports_cancel. Use alone when you need that preview or a delete gate '
      + '(do not stack after validate on the same final input by default). Global --dry-run on curated/'
      + 'capability run also hits this endpoint.',
    )
    .argument('<capability-id>', 'Capability ID, such as analysis.query.export')
    .option('--domain <domain>', 'Override the capability namespace used for gateway routing')
    .option('--input <json-or-path>', 'Input JSON object, file path, @<path>, or - for stdin')
    .action(async (capabilityId: string, opts: { domain?: string; input?: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = resolveCapabilityGatewayDomain(capabilityId, opts.domain);
        return dryRunCapability(host, gatewayDomain, capabilityId, parseCapabilityInput(opts.input));
      });
    })
    .addHelpText(
      'after',
      '\nExamples:\n' +
      '  ae-cli capability dry-run analysis.dashboard.list --input \'{"project_id":1}\'\n' +
      '  ae-cli capability dry-run analysis.dashboard.list --input input.json',
    );

  capability
    .command('run')
    .description('Execute one capability by ID')
    .argument('<capability-id>', 'Capability ID, such as analysis.report.list')
    .option('--domain <domain>', 'Override the capability namespace used for gateway routing')
    .option('--input <json-or-path>', 'Input JSON object, file path, @<path>, or - for stdin')
    .action(async (capabilityId: string, opts: { domain?: string; input?: string }) => {
      await executeAndPrint(program, async (host, globalOpts) => {
        const gatewayDomain = resolveCapabilityGatewayDomain(capabilityId, opts.domain);
        const input = parseCapabilityInput(opts.input);

        if (globalOpts.validate && globalOpts.dryRun) {
          throw new CapabilityCommandValidationError(
            'Cannot combine --validate and --dry-run.',
            'Use --validate to fix parameters; use --dry-run as the pre-execution confirmation.',
          );
        }

        if (globalOpts.validate) {
          return validateCapability(host, gatewayDomain, capabilityId, input);
        }

        if (globalOpts.dryRun) {
          return dryRunCapability(host, gatewayDomain, capabilityId, input);
        }

        if (!globalOpts.yes) {
          const metadata = await inspectCapability(host, gatewayDomain, capabilityId);
          const risk = normalizeRiskLevel(typeof metadata?.risk === 'string' ? metadata.risk : undefined);
          if (requiresConfirmation(risk)) {
            const confirmed = await confirm(`This capability is marked ${risk} (${capabilityId}). Continue?`);
            if (!confirmed) {
              process.stderr.write('Aborted.\n');
              return undefined;
            }
          }
        }

        return executeCapability(host, gatewayDomain, capabilityId, input);
      });
    })
    .addHelpText(
      'after',
      '\nExamples:\n' +
      '  ae-cli capability run analysis.dashboard.list --input \'{"project_id":1}\'\n' +
      '  ae-cli capability run analysis.dashboard.list --input input.json',
    );
}

async function executeAndPrint(
  program: Command,
  action: (host: string, globalOpts: GlobalCapabilityOptions) => Promise<unknown>,
): Promise<void> {
  const globalOpts = program.opts<GlobalCapabilityOptions>();
  const host = resolveHost(globalOpts.host);
  if (!host) {
    printError('config', 'No AE host configured.', 'Run: ae-cli config set-host <url>');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await action(host, globalOpts);
    if (result !== undefined) {
      await printOutput(result, globalOpts.format ?? 'json', globalOpts.jq);
    }
  } catch (error) {
    if ((error as any)?.type === 'validation' && String((error as any)?.message || '').includes('--jq')) {
      printError('validation', (error as Error).message, (error as any).hint);
      process.exitCode = 1;
      return;
    }
    printCapabilityError(error);
    process.exitCode = 1;
  }
}

function printCapabilityError(error: unknown): void {
  if (error instanceof CapabilityCommandValidationError) {
    printError('validation', error.message, error.hint);
    return;
  }
  if (error instanceof SecureStoreAuthError) {
    printError('auth', error.message, 'Run: ae-cli auth login');
    return;
  }
  if (error instanceof PermissionError) {
    printError('permission', error.message, undefined, error.code);
    return;
  }
  if (error instanceof CapabilityGatewayError) {
    printError('api', error.message, error.hint, error.code);
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  printError('api', message);
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
