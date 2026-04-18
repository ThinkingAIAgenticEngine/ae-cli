import Table from 'cli-table3';
import type { OutputFormat, OutputEnvelope } from './types.js';

const KNOWN_ARRAY_FIELDS = [
  'items', 'events', 'reports', 'dashboards', 'tags', 'clusters',
  'flows', 'tasks', 'channels', 'nodes', 'members', 'records',
  'entities', 'metrics', 'tables', 'columns', 'properties',
];

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

export function applyJq(data: any, expr: string): any {
  if (!expr) return data;
  const parts = expr.replace(/^\.(data\.)?/, '').split('.');
  let result: any = data;
  for (const part of parts) {
    const arrayMatch = part.match(/^(.+)\[\]$/);
    if (arrayMatch) {
      result = result?.[arrayMatch[1]];
      if (!Array.isArray(result)) return result;
      continue;
    }
    const indexMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (indexMatch) {
      result = result?.[indexMatch[1]]?.[parseInt(indexMatch[2])];
      continue;
    }
    if (part) {
      result = result?.[part];
    }
  }
  return result;
}

export function formatOutput(data: any, format: OutputFormat, jqExpr?: string): string {
  let processed = data;
  if (jqExpr) {
    processed = applyJq(data, jqExpr);
  }
  if (format === 'table') {
    return formatTable(processed);
  }
  const envelope: OutputEnvelope = { ok: true, data: processed };
  return JSON.stringify(envelope, null, 2);
}

export function formatError(type: OutputEnvelope['error'] extends infer E ? E extends { type: infer T } ? T : never : never, message: string, hint?: string, code?: number): string {
  const envelope: OutputEnvelope = {
    ok: false,
    error: { type: type as any, message, hint, code },
  };
  return JSON.stringify(envelope, null, 2);
}

export function printError(type: 'auth' | 'api' | 'validation' | 'config', message: string, hint?: string, code?: number): void {
  process.stderr.write(formatError(type, message, hint, code) + '\n');
}

export function printOutput(data: any, format: OutputFormat, jqExpr?: string): void {
  process.stdout.write(formatOutput(data, format, jqExpr) + '\n');
}
