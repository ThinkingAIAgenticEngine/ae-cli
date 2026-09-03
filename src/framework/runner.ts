import * as readline from 'readline';
import type { Command, Flag, RuntimeContext, GlobalOptions, OutputFormat } from './types.js';
import { printOutput, printError } from './output.js';
import { getActiveHost } from '../core/config.js';
import { safeJsonParse } from '../core/json-utils.js';
import { logger } from '../core/logger.js';
import { TeAgentCredentialsError } from '../core/te-agent-credentials.js';
import { SecureStoreAuthError } from '../core/secure-store.js';
import { CliValidationError, CommunityReportError, LocalDataUploadError, PermissionError } from '../core/errors.js';
import { TeAgentApiError } from '../core/te-agent-client.js';
import { CapabilityGatewayError } from '../core/capability-api.js';
import { requiresConfirmation } from '../core/capability-risk.js';
import { formatCapabilityMissCompatHint } from '../core/compat-check.js';

/** Build message/hint when one or more required flags are missing. */
export function missingRequiredFlagsError(
  cmdName: string,
  missing: Flag[],
): { message: string; hint: string } {
  const names = missing.map((flag) => `--${flag.name}`);
  const message =
    missing.length === 1
      ? `Missing required flag: ${names[0]}`
      : `Missing required flags: ${names.join(', ')}`;
  const hintParts = missing
    .map((flag) => flag.hint?.trim())
    .filter((hint): hint is string => Boolean(hint));
  const hint =
    hintParts.length > 0
      ? hintParts.join(' ')
      : `Usage: ae-cli ${cmdName} ${names.map((name) => `${name} <value>`).join(' ')}`;
  return { message, hint };
}

interface TeAgentApiErrorPresentation {
  message?: string;
  hint?: string;
  code?: string;
  meta?: Record<string, unknown>;
}

function readSkillCurrentVersion(body: unknown): string | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const currentVersion = (body as Record<string, unknown>).currentVersion;
  if (typeof currentVersion !== 'string') return undefined;
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(currentVersion)
    ? currentVersion
    : undefined;
}

/** Surface only customer-safe recovery details for known Skill update conflicts. */
export function teAgentApiErrorPresentation(err: TeAgentApiError): TeAgentApiErrorPresentation {
  if (err.code === 'SKILL_VERSION_CONFLICT') {
    const currentVersion = readSkillCurrentVersion(err.body);
    return {
      message: 'The Skill content changed, and the new version must be greater than the current version.',
      code: err.code,
      hint: currentVersion
        ? `Retry with --version set to a major.minor version greater than ${currentVersion}.`
        : 'Retry with --version set to a major.minor version greater than the current Skill version.',
      ...(currentVersion ? { meta: { currentVersion } } : {}),
    };
  }
  if (err.code === 'SKILL_HISTORY_CONFLICT') {
    return {
      message: 'The Skill cannot be safely updated right now.',
      code: err.code,
      hint: 'The Skill cannot be safely updated right now. Please contact your administrator.',
    };
  }
  return {};
}

export async function runCommand(cmd: Command, opts: Record<string, any>, globalOpts: GlobalOptions): Promise<void> {
  try {
    const ctx = createRuntimeContext(cmd, opts, globalOpts);

    // Log command execution
    const cmdName = cmd.resource
      ? `${cmd.service} ${cmd.resource} ${cmd.command}`
      : `${cmd.service} ${cmd.command}`;
    logger.command(
      cmdName,
      opts,
      cmd.flags.filter((flag) => flag.sensitive).map((flag) => flag.name),
    );

    // Validate required flags (report all missing at once so agents can fix in one retry)
    const missingRequired = cmd.flags.filter((flag) => {
      if (!flag.required) return false;
      const val = opts[camelCase(flag.name)];
      if (flag.variadic) return !Array.isArray(val) || val.length === 0;
      return val === undefined || val === null || val === '';
    });
    if (missingRequired.length > 0) {
      const { message, hint } = missingRequiredFlagsError(cmdName, missingRequired);
      printError('validation', message, hint);
      process.exit(1);
    }

    // Custom validation
    if (cmd.validate) {
      cmd.validate(ctx);
    }

    // Validate numeric flags. Reject NaN early (Number('abc') -> NaN -> JSON null looks like a
    // confusing gateway "expected integer, got null" error). Pagination-like flags also default
    // to <= 10000 unless a command supplies a stricter flag-level max.
    const LIMIT_FLAG_PATTERNS = [/limit/i, /page_size/i, /pagesize/i, /row_limit/i, /block_limit/i, /top[-_]?k/i];
    for (const flag of cmd.flags) {
      const val = opts[camelCase(flag.name)];
      if (flag.variadic) continue;

      // Boolean flags: parseBooleanValue returns the raw string when the value is not a
      // recognized boolean. Surface a unified JSON validation error instead of a Node stack trace.
      if (flag.type === 'boolean') {
        if (val !== undefined && typeof val !== 'boolean') {
          printError('validation', `Invalid boolean for --${flag.name}: ${val}. Use true/false.`);
          process.exit(1);
        }
        continue;
      }

      if (flag.type !== 'number') continue;
      if (flag.variadic) continue;
      if (val === undefined || val === null || val === '') continue;
      const num = Number(val);
      if (!Number.isFinite(num)) {
        printError('validation', `--${flag.name} must be a number (got: ${val})`);
        process.exit(1);
      }
      const isLimitFlag = LIMIT_FLAG_PATTERNS.some((p) => p.test(flag.name));
      if (isLimitFlag) {
        const min = flag.min ?? 1;
        const max = flag.max ?? 10000;
        if (!Number.isInteger(num) || num < min || num > max) {
          printError('validation', `--${flag.name} must be an integer between ${min} and ${max} (got: ${val})`);
          process.exit(1);
        }
      } else if (flag.min !== undefined || flag.max !== undefined) {
        const min = flag.min ?? Number.NEGATIVE_INFINITY;
        const max = flag.max ?? Number.POSITIVE_INFINITY;
        if (num < min || num > max) {
          const lower = flag.min === undefined ? '-Infinity' : String(min);
          const upper = flag.max === undefined ? 'Infinity' : String(max);
          printError('validation', `--${flag.name} must be a number between ${lower} and ${upper} (got: ${val})`);
          process.exit(1);
        }
      }
    }

    // Validate string contract constraints before any local dry-run or remote request.
    for (const flag of cmd.flags) {
      if (flag.type !== 'string') continue;
      if (flag.variadic) continue;
      const val = opts[camelCase(flag.name)];
      if (val === undefined || val === null || val === '') continue;
      const error = stringFlagValidationError(flag, String(val));
      if (error) {
        printError('validation', error.message, error.hint);
        process.exit(1);
      }
    }

    // --validate and --dry-run are mutually exclusive
    if (globalOpts.validate && globalOpts.dryRun) {
      printError(
        'validation',
        'Cannot combine --validate and --dry-run.',
        'Use --validate to fix parameters; use --dry-run as the pre-execution confirmation.',
      );
      process.exit(1);
    }

    // Parameter validate (capability commands hit gateway .../validate)
    if (globalOpts.validate) {
      if (cmd.validateInput) {
        const validateResult = await cmd.validateInput(ctx);
        await printOutput(validateResult, globalOpts.format, globalOpts.jq);
      } else {
        await printOutput(
          { message: 'No --validate implementation for this command (capability gateway commands only)' },
          globalOpts.format,
        );
      }
      return;
    }

    // Dry run (capability commands hit gateway .../dry-run; MCP/REST may return a local preview)
    if (globalOpts.dryRun) {
      if (cmd.dryRun) {
        const dryResult = await cmd.dryRun(ctx);
        await printOutput(dryResult, globalOpts.format, globalOpts.jq);
      } else {
        await printOutput({ message: 'No dry-run implementation for this command' }, globalOpts.format);
      }
      return;
    }

    // Confirm for high-risk-write operations (delete)
    if (requiresConfirmation(cmd.risk)) {
      // Pre-flight: force input parsing (JSON/boolean flags) before prompting, so invalid
      // parameters surface as validation errors instead of being hidden behind the confirmation.
      cmd.preflight?.(ctx);
      if (!globalOpts.yes) {
        const confirmed = await confirm(`This is a high-risk-write operation (${cmdName}). Continue?`);
        if (!confirmed) {
          process.stderr.write('Aborted.\n');
          process.exit(0);
        }
      }
    }

    // Execute
    const result = await cmd.execute(ctx);
    await ctx.out(result);
  } catch (err: any) {
    if (err?.type === 'validation' && typeof err?.hint === 'string' && String(err.message || '').includes('--jq')) {
      printError('validation', err.message, err.hint);
      process.exit(1);
    }
    const message = err.message || String(err);
    if (!(err instanceof CommunityReportError)) {
      if (!(err instanceof LocalDataUploadError)) logger.error(`Command failed: ${message}`);
    }
    // F-018: classify by structured error type (instanceof), NOT by substring-matching the message —
    // string matching mislabeled permission denials (403, message contains "403"/"auth") as session
    // expiry and prompted a useless re-login.
    if (err instanceof CliValidationError) {
      printError(
        'validation',
        message,
        err.hint,
        err.code,
        err.location ? { location: err.location } : undefined,
      );
    } else if (err instanceof TeAgentCredentialsError) {
      // F-001: forward hint to guide the user to configure credentials or log in
      printError('config', message, err.hint);
    } else if (err instanceof PermissionError) {
      // authenticated-but-forbidden — surface the server's reason; re-login won't help
      printError('permission', message, err.hint, err.code);
    } else if (err instanceof CapabilityGatewayError) {
      printError('api', message, err.hint ?? capabilityGatewayHint(err), err.code, err.meta);
    } else if (err instanceof CommunityReportError) {
      // The message/hint may come from the ingestion response. Keep it visible to the caller but
      // never persist it to CLI logs; the dedicated client records only URL/status/byte counts.
      printError('api', message, err.hint, err.code, err.meta, { log: false });
    } else if (err instanceof LocalDataUploadError) {
      printError('api', message, err.hint, err.code, err.meta, { log: false });
    } else if (err instanceof SecureStoreAuthError) {
      printError('auth', message, 'Run: ae-cli auth login');
    } else if (err instanceof TeAgentApiError) {
      if (err.status === 403) {
        printError('permission', message);
      } else if (err.status === 401) {
        printError('auth', message, 'Run: ae-cli auth login');
      } else {
        const presentation = teAgentApiErrorPresentation(err);
        printError(
          'api',
          presentation.message ?? message,
          presentation.hint,
          presentation.code,
          presentation.meta,
        );
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

export function stringFlagValidationError(
  flag: Command['flags'][number],
  value: string,
): { message: string; hint?: string } | undefined {
  if (flag.type !== 'string') return undefined;
  if (flag.minLength !== undefined && value.length < flag.minLength) {
    return { message: `--${flag.name} must contain at least ${flag.minLength} characters` };
  }
  if (flag.maxLength !== undefined && value.length > flag.maxLength) {
    return { message: `--${flag.name} must not exceed ${flag.maxLength} characters (got: ${value.length})` };
  }
  if (flag.pattern !== undefined && !new RegExp(flag.pattern).test(value)) {
    return { message: `--${flag.name} has an invalid format`, hint: `Expected pattern: ${flag.pattern}` };
  }
  return undefined;
}

export function capabilityGatewayHint(err: CapabilityGatewayError): string | undefined {
  if (
    err.code === 'UPLOAD_NOT_EXIST'
    && (
      err.meta?.capability_id === 'engage-setting.config-table.save'
      || err.meta?.capability_id === 'engage-setting.config-table.update-data'
    )
  ) {
    return 'Run config-table upload first with the same --project-id and --request-id, then retry this command within 10 minutes. The upload cache is consumed after a successful save/update.';
  }
  const compatExtra = formatCapabilityMissCompatHint();
  if (err.code === 'CAPABILITY_NOT_FOUND') {
    const base =
      'The current host does not expose this capability. Do not retry with different parameters; use a supported command path or ask the platform/backend owner to enable the capability.';
    return compatExtra ? `${base}\n${compatExtra}` : base;
  }
  if (err.httpStatus === 404 && !err.code) {
    const base =
      'The current host returned 404 for this capability route. Do not keep retrying the same command; verify the backend route/capability deployment. If --host points directly to a local Common service instead of the deployed gateway, scope AE_CLI_CAPABILITY_GATEWAY_DOMAIN= to this command so it uses /api/cli/v1.';
    return compatExtra ? `${base}\n${compatExtra}` : base;
  }
  return undefined;
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

  let _communityReportModule: typeof import('../core/community-report-client.js') | null = null;
  async function getCommunityReportClient() {
    if (!_communityReportModule) {
      _communityReportModule = await import('../core/community-report-client.js');
    }
    return _communityReportModule;
  }

  let _localDataUploadModule: typeof import('../core/local-data-upload-client.js') | null = null;
  async function getLocalDataUploadClient() {
    if (!_localDataUploadModule) {
      _localDataUploadModule = await import('../core/local-data-upload-client.js');
    }
    return _localDataUploadModule;
  }

  const ctx: RuntimeContext = {
    str(name: string): string {
      return String(opts[camelCase(name)] ?? '');
    },
    num(name: string): number {
      const val = opts[camelCase(name)];
      return val !== undefined ? Number(val) : 0;
    },
    optionalNum(name: string): number | undefined {
      const val = opts[camelCase(name)];
      if (val === undefined || val === null || val === '') return undefined;
      return Number(val);
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
    list(name: string): string[] {
      const val = opts[camelCase(name)];
      if (Array.isArray(val)) return val.map(String);
      if (val === undefined || val === null || val === '') return [];
      return [String(val)];
    },

    async api(method: string, path: string, params?: Record<string, any>, data?: any): Promise<any> {
      const client = await getClient();
      if (method.toUpperCase() === 'GET') {
        return client.httpGet(path, params, ctx.host());
      } else {
        return client.httpRequest(method, path, params, data, ctx.host());
      }
    },

    async communityReport(endpoint: string, rawBody: string): Promise<any> {
      const client = await getCommunityReportClient();
      return client.communityReport(endpoint, rawBody);
    },

    async querySql(projectId: number, sql: string): Promise<any> {
      const client = await getClient();
      return client.querySql(projectId, sql, ctx.host());
    },

    async queryReportData(projectId: number, reportId: number, qp: any, eventModel: number, options?: Record<string, any>): Promise<any> {
      const client = await getClient();
      return client.queryReportData(projectId, reportId, qp, eventModel, options, ctx.host());
    },

    async localDataUpload(endpoint: string, rawBody: string, options?: Record<string, any>): Promise<any> {
      const client = await getLocalDataUploadClient();
      return client.localDataUpload(endpoint, rawBody, options);
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

    async out(data: any): Promise<void> {
      await printOutput(data, globalOpts.format, globalOpts.jq);
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
