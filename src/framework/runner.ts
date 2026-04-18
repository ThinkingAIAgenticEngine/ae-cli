import * as readline from 'readline';
import type { Command, RuntimeContext, GlobalOptions, OutputFormat } from './types.js';
import { printOutput, printError } from './output.js';
import { getActiveHost } from '../core/config.js';

export async function runCommand(cmd: Command, opts: Record<string, any>, globalOpts: GlobalOptions): Promise<void> {
  try {
    const ctx = createRuntimeContext(cmd, opts, globalOpts);

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
    if (message.includes('token') || message.includes('auth') || message.includes('401') || message.includes('403')) {
      printError('auth', message, 'Run: ae-cli auth login');
    } else if (message.includes('TE API error')) {
      printError('api', message);
    } else {
      printError('api', message);
    }
    process.exit(1);
  }
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
        return JSON.parse(String(val));
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
        return client.httpPost(path, params, data, ctx.host());
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