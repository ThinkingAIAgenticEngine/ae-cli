import { Command as CommanderCommand } from 'commander';
import { httpGet, httpPost } from '../core/client.js';
import { resolveHost } from '../core/auth.js';
import { printOutput, printError } from '../framework/output.js';
import type { OutputFormat } from '../framework/types.js';
import { safeJsonParse } from '../core/json-utils.js';
import { SecureStoreAuthError } from '../core/secure-store.js';

export function registerApi(program: CommanderCommand): void {
  program
    .command('api')
    .description('Raw API call: ae-cli api <METHOD> <PATH> [options]')
    .argument('<method>', 'HTTP method (GET, POST)')
    .argument('<path>', 'API path (e.g., /v1/ta/event/catalog/listEvent)')
    .option('--params <json>', 'URL parameters as JSON')
    .option('--data <json>', 'Request body as JSON')
    .action(async (method: string, apiPath: string, opts: Record<string, any>) => {
      const globalOpts = program.opts();
      const host = resolveHost(globalOpts.host);
      const format: OutputFormat = globalOpts.format || 'json';
      const jq: string | undefined = globalOpts.jq;

      if (!host) {
        printError('config', 'No AE host configured.', 'Run: ae-cli config set-host <url>');
        process.exit(1);
      }

      try {
        let params: Record<string, any> = {};
        let body: any = undefined;

        if (opts.params) {
          try { params = safeJsonParse(opts.params); } catch {
            printError('validation', `Invalid JSON for --params: ${opts.params}`);
            process.exit(1);
          }
        }
        if (opts.data) {
          try { body = safeJsonParse(opts.data); } catch {
            printError('validation', `Invalid JSON for --data: ${opts.data}`);
            process.exit(1);
          }
        }

        let result: any;
        if (method.toUpperCase() === 'GET') {
          result = await httpGet(apiPath, params, host);
        } else {
          result = await httpPost(apiPath, params, body, host);
        }

        await printOutput(result, format, jq);
      } catch (err: any) {
        if (err?.type === 'validation' && String(err.message || '').includes('--jq')) {
          printError('validation', err.message, err.hint);
        } else if (err instanceof SecureStoreAuthError) {
          printError('auth', err.message, 'Run: ae-cli auth login');
        } else {
          printError('api', err.message);
        }
        process.exit(1);
      }
    });
}
