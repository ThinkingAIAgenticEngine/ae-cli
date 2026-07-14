import * as readline from 'node:readline';
import { Command } from 'commander';
import { resolveHost } from '../../core/auth.js';
import {
  CapabilityGatewayError,
  dryRunCapability,
  executeCapability,
  inspectCapability,
  listCapabilities,
} from '../../core/capability-api.js';
import { PermissionError } from '../../core/errors.js';
import { SecureStoreAuthError } from '../../core/secure-store.js';
import { findGatewayDomain } from '../../core/capability-routing.js';
import { printError, printOutput } from '../../framework/output.js';
import type { OutputFormat } from '../../framework/types.js';
import {
  CapabilityCommandValidationError,
  filterCapabilities,
  normalizeCapabilityList,
  parseCapabilityInput,
  resolveCapabilityGatewayDomain,
} from './helpers.js';
import { normalizeRiskLevel, requiresConfirmation } from '../../core/capability-risk.js';

type GlobalCapabilityOptions = {
  format?: OutputFormat;
  jq?: string;
  host?: string;
  yes?: boolean;
  dryRun?: boolean;
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
    .action(async (opts: { domain: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = findGatewayDomain(opts.domain) ?? opts.domain;
        const catalog = normalizeCapabilityList(await listCapabilities(host, gatewayDomain));
        const capabilities = filterCapabilities(catalog, opts.domain);
        return { domain: opts.domain, count: capabilities.length, capabilities };
      });
    })
    .addHelpText('after', '\nExample:\n  ae-cli capability list --domain analysis');

  capability
    .command('search')
    .description('Search capability IDs and descriptions in a domain')
    .argument('<query>', 'Case-insensitive search terms')
    .requiredOption('--domain <domain>', 'Capability namespace, such as analysis or metadata')
    .action(async (query: string, opts: { domain: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = findGatewayDomain(opts.domain) ?? opts.domain;
        const catalog = normalizeCapabilityList(await listCapabilities(host, gatewayDomain));
        const capabilities = filterCapabilities(catalog, opts.domain, query);
        return { domain: opts.domain, query, count: capabilities.length, capabilities };
      });
    })
    .addHelpText('after', '\nExample:\n  ae-cli capability search "dashboard list" --domain analysis');

  capability
    .command('inspect')
    .description('Inspect one capability schema, risk, auth, and output metadata')
    .argument('<capability-id>', 'Capability ID, such as analysis.report.list')
    .option('--domain <domain>', 'Override the capability namespace used for gateway routing')
    .action(async (capabilityId: string, opts: { domain?: string }) => {
      await executeAndPrint(program, async (host) => {
        const gatewayDomain = resolveCapabilityGatewayDomain(capabilityId, opts.domain);
        return inspectCapability(host, gatewayDomain, capabilityId);
      });
    })
    .addHelpText('after', '\nExample:\n  ae-cli capability inspect analysis.dashboard.list');

  capability
    .command('dry-run')
    .description('Validate and preview one capability invocation without executing it')
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
      '  ae-cli capability run analysis.dashboard.list --input input.json --yes',
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
      printOutput(result, globalOpts.format ?? 'json', globalOpts.jq);
    }
  } catch (error) {
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
    printError('permission', error.message);
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
