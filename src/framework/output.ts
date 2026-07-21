import Table from 'cli-table3';
import { JqError, json as jqJson } from 'jq-wasm';
import type { OutputFormat, OutputEnvelope } from './types.js';
import { logger } from '../core/logger.js';
import { getPendingHostCompatNotice } from '../core/compat-check.js';

const KNOWN_ARRAY_FIELDS = [
  'items', 'events', 'reports', 'dashboards', 'tags', 'clusters',
  'flows', 'tasks', 'channels', 'nodes', 'members', 'records',
  'entities', 'metrics', 'tables', 'columns', 'properties',
];

const OUTPUT_METADATA = Symbol('ae-cli-output-metadata');

interface OutputWithMetadata {
  [OUTPUT_METADATA]: true;
  data: any;
  meta: Record<string, unknown>;
}

export function withOutputMetadata(data: any, meta?: Record<string, unknown>): any {
  if (!meta || Object.keys(meta).length === 0) return data;
  return {
    [OUTPUT_METADATA]: true,
    data,
    meta,
  } satisfies OutputWithMetadata;
}

function isOutputWithMetadata(value: any): value is OutputWithMetadata {
  return Boolean(value?.[OUTPUT_METADATA]);
}

function findArrayField(data: any): any[] | null {
  if (Array.isArray(data)) return data;
  if (typeof data !== 'object' || data === null) return null;
  for (const key of KNOWN_ARRAY_FIELDS) {
    if (Array.isArray(data[key])) return data[key];
  }
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key])) return data[key];
  }
  return null;
}

function formatTable(data: any): string {
  const rows = findArrayField(data);
  if (!rows || rows.length === 0) {
    return JSON.stringify(data, null, 2);
  }
  const allKeys = new Set<string>();
  for (const row of rows) {
    if (typeof row === 'object' && row !== null) {
      Object.keys(row).forEach(k => allKeys.add(k));
    }
  }
  const keys = Array.from(allKeys);
  if (keys.length === 0) return JSON.stringify(rows, null, 2);

  const table = new Table({ head: keys, wordWrap: true });
  for (const row of rows) {
    table.push(keys.map(k => {
      const v = row?.[k];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    }));
  }
  return table.toString();
}

/**
 * Apply a real jq (1.8) expression to command payload data (before output envelope wrapping).
 * Multi-value streams (e.g. `.items[]`) become arrays; a single value is unwrapped.
 */
export async function applyJq(data: any, expr: string): Promise<any> {
  const trimmed = expr.trim();
  if (!trimmed) return data;

  let results: unknown[];
  try {
    results = await jqJson(data, trimmed);
  } catch (err: any) {
    const message = err instanceof JqError
      ? err.message
      : (err?.message || String(err));
    const error = new Error(`Invalid --jq expression: ${message}`);
    (error as any).type = 'validation';
    (error as any).hint = 'Use standard jq syntax, e.g. .status or {status,pendingQuestion}';
    throw error;
  }

  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  return results;
}

export async function formatOutput(data: any, format: OutputFormat, jqExpr?: string): Promise<string> {
  const outputData = isOutputWithMetadata(data) ? data.data : data;
  const meta = isOutputWithMetadata(data) ? data.meta : undefined;
  let processed = outputData;
  if (jqExpr) {
    processed = await applyJq(outputData, jqExpr);
  }
  if (format === 'table') {
    return formatTable(processed);
  }
  const hostCompat = getPendingHostCompatNotice();
  const envelope: OutputEnvelope = {
    ok: true,
    data: processed,
    ...(meta ? { meta } : {}),
    // Soft tip lives only under _notice (not mirrored into meta) to avoid duplicate fields.
    ...(hostCompat ? { _notice: { host_compat: hostCompat } } : {}),
  };
  return JSON.stringify(envelope, null, 2);
}

export function formatError(
  type: OutputEnvelope['error'] extends infer E ? E extends { type: infer T } ? T : never : never,
  message: string,
  hint?: string,
  code?: string | number,
  meta?: Record<string, unknown>,
): string {
  const envelope: OutputEnvelope = {
    ok: false,
    error: { type: type as any, message, hint, code },
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };
  return JSON.stringify(envelope, null, 2);
}

export function printError(
  type: 'auth' | 'permission' | 'api' | 'validation' | 'config',
  message: string,
  hint?: string,
  code?: string | number,
  meta?: Record<string, unknown>,
  options: { log?: boolean } = {},
): void {
  const formatted = formatError(type, message, hint, code, meta);
  process.stderr.write(formatted + '\n');
  if (options.log !== false) {
    logger.error(`[${type}] ${message}${hint ? ' | ' + hint : ''}`);
  }
}

export async function printOutput(data: any, format: OutputFormat, jqExpr?: string): Promise<void> {
  process.stdout.write(await formatOutput(data, format, jqExpr) + '\n');
  // Non-interactive (Agent) shells often merge streams and skim the end of output;
  // re-emit host compat after stdout so it is not lost above a large JSON payload.
  const hostCompat = getPendingHostCompatNotice();
  if (hostCompat && (!process.stdout.isTTY || !process.stderr.isTTY)) {
    process.stderr.write(`${hostCompat}\n`);
  }
}
