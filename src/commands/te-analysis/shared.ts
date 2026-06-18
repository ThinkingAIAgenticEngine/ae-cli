import type { Command, Flag, RiskLevel, RuntimeContext } from '../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../core/mcp.js';

interface CreateMcpCommandConfig {
  command: `+${string}`;
  description: string;
  flags: Flag[];
  risk: RiskLevel;
  mcpService?: string;
  validate?: (ctx: RuntimeContext) => void;
  buildArgs: (ctx: RuntimeContext) => Record<string, unknown>;
}

export function createMcpCommand(config: CreateMcpCommandConfig): Command {
  const toolName = config.command.slice(1);
  const mcpService = config.mcpService || 'analysis';

  return {
    service: 'analysis',
    command: config.command,
    description: config.description,
    flags: config.flags,
    risk: config.risk,
    validate: config.validate,
    dryRun: (ctx) => ({
      method: 'tools/call',
      url: resolveMcpUrl(ctx.mcpUrl(), ctx.host(), mcpService),
      body: {
        name: toolName,
        arguments: config.buildArgs(ctx),
      },
    }),
    execute: async (ctx) => {
      const url = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), mcpService);
      const result = await callMcpTool(url, toolName, config.buildArgs(ctx), ctx.host());
      return parseMcpResult(result);
    },
  };
}

export function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

export function optionalNumber(ctx: RuntimeContext, name: string): number | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : Number(value);
}

export function optionalBoolean(ctx: RuntimeContext, name: string): boolean | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : ctx.bool(name);
}

export function optionalJson(ctx: RuntimeContext, name: string): unknown | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : ctx.json(name);
}

export function optionalJsonString(ctx: RuntimeContext, name: string): string | undefined {
  const value = optionalJson(ctx, name);
  return value === undefined ? undefined : JSON.stringify(value);
}

export function requiredJsonString(ctx: RuntimeContext, name: string): string {
  return JSON.stringify(ctx.json(name));
}

// Row-count limits for data-query commands. Default is agent-friendly; the
// maximum is a physical guard against overload, not an artificial throttle.
export const DEFAULT_QUERY_LIMIT = 1000;
export const MAX_QUERY_LIMIT = 100000;

// Reject a row limit outside the physical range [1, MAX_QUERY_LIMIT].
// undefined means "not provided" and is left for default resolution.
export function assertLimitWithinCap(value: number | undefined, flagName: string): void {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 1 || value > MAX_QUERY_LIMIT) {
    throw new Error(`--${flagName} must be an integer between 1 and ${MAX_QUERY_LIMIT} (got: ${value}).`);
  }
}

// Extract the row count from a trailing LIMIT clause. Returns undefined when the
// SQL has no trailing LIMIT, so an in-subquery LIMIT does not cause a false match.
// Supports "LIMIT n", "LIMIT n OFFSET m", and MySQL "LIMIT offset, count".
export function extractTrailingSqlLimit(sql: string): number | undefined {
  const m = sql.match(/\blimit\s+(\d+)(?:\s*,\s*(\d+))?(?:\s+offset\s+\d+)?\s*;?\s*$/i);
  if (!m) return undefined;
  return m[2] !== undefined ? Number(m[2]) : Number(m[1]);
}

// Locate an SQL string anywhere inside a qp value. The qp shape for model_type=sql
// is resolved at runtime, so we find the first string that looks like a SELECT.
export function findSqlInQp(qp: unknown): string | undefined {
  let found: string | undefined;
  const visit = (v: unknown): void => {
    if (found !== undefined) return;
    if (typeof v === 'string') {
      if (/\bselect\b/i.test(v) && /\bfrom\b/i.test(v)) found = v;
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (v && typeof v === 'object') {
      Object.values(v as Record<string, unknown>).forEach(visit);
    }
  };
  visit(qp);
  return found;
}

// Single-source-of-truth rule for model_type=sql: a SQL LIMIT and --limit must not
// silently stack. If the SQL has a trailing LIMIT and --limit is also given, the two
// must be equal; otherwise the result is sampled/duplicated incorrectly.
export function assertSqlLimitConsistent(qp: unknown, providedLimit: number | undefined): void {
  if (providedLimit === undefined) return;
  const sql = findSqlInQp(qp);
  if (sql === undefined) return;
  const sqlLimit = extractTrailingSqlLimit(sql);
  if (sqlLimit === undefined) return;
  if (sqlLimit !== providedLimit) {
    throw new Error(
      `Conflicting row limits: SQL "LIMIT ${sqlLimit}" != --limit ${providedLimit}. ` +
      'For model_type=sql, omit LIMIT from the SQL and use --limit, or keep the two equal.',
    );
  }
}

// Resolve the limit to send for an SQL ad-hoc query. An explicit --limit wins; when
// omitted, a SQL with its own trailing LIMIT governs (send nothing, avoiding a second
// limit), otherwise fall back to the default.
export function resolveSqlAwareLimit(
  providedLimit: number | undefined,
  modelType: string,
  qp: unknown,
): number | undefined {
  if (providedLimit !== undefined) return providedLimit;
  if (modelType === 'sql') {
    const sql = findSqlInQp(qp);
    if (sql !== undefined && extractTrailingSqlLimit(sql) !== undefined) return undefined;
  }
  return DEFAULT_QUERY_LIMIT;
}
