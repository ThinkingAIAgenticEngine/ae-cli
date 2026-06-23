import * as readline from 'readline';
import type { Command, RuntimeContext, GlobalOptions, OutputFormat } from './types.js';
import { printOutput, printError } from './output.js';
import { getActiveHost } from '../core/config.js';
import { safeJsonParse } from '../core/json-utils.js';
import { logger } from '../core/logger.js';
import { TeAgentCredentialsError } from '../core/te-agent-credentials.js';
import { SecureStoreAuthError } from '../core/secure-store.js';
import { PermissionError } from '../core/errors.js';
import { TeAgentApiError } from '../core/te-agent-client.js';

export async function runCommand(cmd: Command, opts: Record<string, any>, globalOpts: GlobalOptions): Promise<void> {
  try {
    const ctx = createRuntimeContext(cmd, opts, globalOpts);

    // Log command execution
    const cmdName = `${cmd.service} ${cmd.command}`;
    logger.command(cmdName, opts);

    // Validate required flags
    for (const flag of cmd.flags) {
      if (flag.required) {
        const val = opts[camelCase(flag.name)];
        if (val === undefined || val === null || val === '') {
          printError('validation', `Missing required flag: --${flag.name}`, `Usage: ae-cli ${cmd.service} ${cmd.command} --${flag.name} <value>`);
          process.exit(1);
        }
      }
    }

    // Custom validation
    if (cmd.validate) {
      cmd.validate(ctx);
    }

    // Dry run
    if (globalOpts.dryRun) {
      if (cmd.dryRun) {
        const dryResult = cmd.dryRun(ctx);
        printOutput(dryResult, globalOpts.format, globalOpts.jq);
      } else {
        printOutput({ message: 'No dry-run implementation for this command' }, globalOpts.format);
      }
      return;
    }

    // Confirm for write operations
    if (cmd.risk === 'write' && !globalOpts.yes) {
      const confirmed = await confirm(`This is a write operation (${cmd.service} ${cmd.command}). Continue?`);
      if (!confirmed) {
        process.stderr.write('Aborted.\n');
        process.exit(0);
      }
    }

    // Execute
    const result = await cmd.execute(ctx);
    ctx.out(result);
  } catch (err: any) {
    const message = err.message || String(err);
    logger.error(`Command failed: ${message}`);
    // F-018: classify by structured error type (instanceof), NOT by substring-matching the message —
    // string matching mislabeled permission denials (403, message contains "403"/"auth") as session
    // expiry and prompted a useless re-login.
    if (err instanceof TeAgentCredentialsError) {
      // F-001: forward hint to guide the user to configure credentials or log in
      printError('config', message, err.hint);
    } else if (err instanceof PermissionError) {
      // authenticated-but-forbidden — surface the server's reason; re-login won't help
      printError('permission', message);
    } else if (err instanceof SecureStoreAuthError) {
      printError('auth', message, 'Run: ae-cli auth login');
    } else if (err instanceof TeAgentApiError) {
      if (err.status === 403) {
        printError('permission', message);
      } else if (err.status === 401) {
        printError('auth', message, 'Run: ae-cli auth login');
      } else {
        printError('api', message);
      }
    } else if (looksLikeAuthFailure(message)) {
      // Narrow fallback for plain Errors signaling a genuine token/session failure (e.g. mcp-token mint
      // returning -1001 / "Invalid access token"). Deliberately excludes 403 / forbidden / permission.
      printError('auth', message, 'Run: ae-cli auth login');
    } else {
      printError('api', message);
    }
    process.exit(1);
  }
}

/** Narrow heuristic: does a plain-Error message indicate a genuine auth/session failure (not a 403/permission)? */
export function looksLikeAuthFailure(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes('403') || m.includes('forbidden') || m.includes('permission')) return false;
  return (
    m.includes('401') ||
    m.includes('unauthorized') ||
    m.includes('session expired') ||
    m.includes('invalid access token') ||
    m.includes('-1001') ||
    m.includes('\u767b\u5f55') ||
    m.includes('ae-cli auth login')
  );
}

function createRuntimeContext(cmd: Command, opts: Record<string, any>, globalOpts: GlobalOptions): RuntimeContext {
  // Lazy imports to avoid circular dependencies
  let _clientModule: any = null;
  async function getClient() {
    if (!_clientModule) {
      _clientModule = await import('../core/client.js');
    }
    return _clientModule;
  }

  const ctx: RuntimeContext = {
    str(name: string): string {
      return String(opts[camelCase(name)] ?? '');
    },
    num(name: string): number {
      const val = opts[camelCase(name)];
      return val !== undefined ? Number(val) : 0;
    },
    bool(name: string): boolean {
      return Boolean(opts[camelCase(name)]);
    },
    json(name: string): any {
      const val = opts[camelCase(name)];
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'object') return val;
      try {
        return safeJsonParse(String(val));
      } catch {
        printError('validation', `Invalid JSON for --${name}: ${val}`);
        process.exit(1);
      }
    },

    async api(method: string, path: string, params?: Record<string, any>, data?: any): Promise<any> {
      const client = await getClient();
      if (method.toUpperCase() === 'GET') {
        return client.httpGet(path, params, ctx.host());
      } else {
        return client.httpRequest(method, path, params, data, ctx.host());
      }
    },

    async querySql(projectId: number, sql: string): Promise<any> {
      const client = await getClient();
      return client.querySql(projectId, sql, ctx.host());
    },

    async queryReportData(projectId: number, reportId: number, qp: any, eventModel: number, options?: Record<string, any>): Promise<any> {
      const client = await getClient();
      return client.queryReportData(projectId, reportId, qp, eventModel, options, ctx.host());
    },

    async token(): Promise<string> {
      const { getToken } = await import('../core/auth.js');
      return getToken(ctx.host());
    },

    host(): string {
      if (globalOpts.host) return globalOpts.host;
      return getActiveHost();
    },

    mcpUrl(): string | undefined {
      return globalOpts.mcpUrl;
    },

    service(): string {
      return cmd.service;
    },

    out(data: any): void {
      printOutput(data, globalOpts.format, globalOpts.jq);
    },
  };

  return ctx;
}

function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
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
