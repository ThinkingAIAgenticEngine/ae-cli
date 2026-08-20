import type { LocalDataRow, NestedNode } from './types.js';
import { isParseableByAnyFormat } from './time.js';

/** Flatten only 1 level deep; deeper objects/arrays are stringified. */
export const NDJSON_MAX_DEPTH = 1;

const NESTED_NODE_SAMPLE_LIMIT = 5;
const NESTED_SAMPLE_TRUNCATE = 40;

/** Walk a dot path into an object, returning undefined on any missing segment. */
export function getNestedValue(obj: unknown, path: string): unknown {
  let current: any = obj;
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

export function flattenJSON(
  obj: any,
  prefix = '',
  depth = 0,
  maxDepth = NDJSON_MAX_DEPTH,
): Record<string, string> {
  if (obj == null) {
    if (!prefix) return {};
    return { [prefix]: '' };
  }
  if (typeof obj !== 'object') {
    return { [prefix]: String(obj) };
  }
  if (Array.isArray(obj)) {
    return { [prefix]: JSON.stringify(obj) };
  }
  if (depth >= maxDepth) {
    return { [prefix]: JSON.stringify(obj) };
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const childKey = prefix ? `${prefix}.${key}` : key;
    Object.assign(result, flattenJSON(value, childKey, depth + 1, maxDepth));
  }
  return result;
}

/**
 * Build a flat row honoring flatten_rules. Top-level keys not covered by any rule keep the
 * default depth-1 flattening; each rule maps an output column to a dot-path source value
 * (stringified when object/array).
 */
export function buildRowWithFlatten(obj: any, flattenRules: Record<string, string>): Record<string, string> {
  const row: Record<string, string> = {};
  const coveredRoots = new Set(Object.values(flattenRules).map((path) => path.split('.')[0]));

  const base = flattenJSON(obj);
  for (const [key, value] of Object.entries(base)) {
    if (!coveredRoots.has(key)) row[key] = value;
  }

  for (const [outColumn, sourcePath] of Object.entries(flattenRules)) {
    const value = getNestedValue(obj, sourcePath);
    row[outColumn] = value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  return row;
}

/** Flatten a parsed NDJSON record when rules are given; otherwise pass objects through unchanged. */
export function flattenLocalDataRow(value: unknown, flattenRules?: Record<string, string>): LocalDataRow {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (flattenRules && Object.keys(flattenRules).length > 0) {
      return buildRowWithFlatten(value, flattenRules) as unknown as LocalDataRow;
    }
    return value as LocalDataRow;
  }
  return { value };
}

/**
 * Apply flatten_rules to a delimited (CSV/TSV) row. Each rule's path is `<column>.<dot.path>`,
 * where `<column>` names a cell holding JSON-encoded nested data: parse that cell, extract the
 * sub-path, and write the value to the rule's out column. Non-JSON, missing, or absent cells are
 * left untouched. This mirrors NDJSON flattening with one extra parse step, since the nested
 * object lives inside a string cell rather than being the row itself.
 */
export function flattenDelimitedRow(row: LocalDataRow, flattenRules: Record<string, string>): LocalDataRow {
  const result: LocalDataRow = { ...row };
  for (const [outColumn, path] of Object.entries(flattenRules)) {
    const dot = path.indexOf('.');
    if (dot <= 0) continue; // requires <column>.<sub-path>
    const column = path.slice(0, dot);
    const cell = row[column];
    if (typeof cell !== 'string') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(cell);
    } catch {
      continue;
    }
    const value = getNestedValue(parsed, path.slice(dot + 1));
    if (value === null || value === undefined) continue;
    result[outColumn] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
  return result;
}

/**
 * Build a bounded recursive structure of sampled NDJSON/JSON records for the
 * inspect step. Object nodes expose the union of child keys; array nodes expose
 * an element kind; primitive leaves expose an inferred type and truncated samples.
 * The tree is for flatten decisions only and never carries more than the sampled
 * values.
 */
export function buildNestedTree(rows: unknown[]): NestedNode[] {
  const objects = rows.filter((row): row is Record<string, unknown> =>
    row !== null && typeof row === 'object' && !Array.isArray(row));
  return buildObjectChildren(objects, '');
}

function buildObjectChildren(objects: Record<string, unknown>[], parentPath: string): NestedNode[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const object of objects) {
    for (const key of Object.keys(object)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys.map((key) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const values = objects
      .map((object) => object[key])
      .filter((value) => value !== undefined);
    const nonEmpty = values.some((value) => !isEmpty(value));
    return buildNode(path, key, values, nonEmpty);
  });
}

function buildNode(path: string, name: string, values: unknown[], nonEmpty: boolean): NestedNode {
  const arrays = values.filter(Array.isArray);
  const objects = values.filter((value) => value !== null && typeof value === 'object' && !Array.isArray(value));
  const structural = arrays.length + objects.length;
  if (structural > 0 && structural >= values.length - structural) {
    if (arrays.length > objects.length) {
      const elementValues = arrays.flat() as unknown[];
      const elementKind = elementValues.some((value) => value !== null && typeof value === 'object')
        ? 'object'
        : 'primitive';
      return { path, name, kind: 'array', elementKind, nonEmpty };
    }
    return { path, name, kind: 'object', children: buildObjectChildren(objects, path), nonEmpty };
  }
  return { path, name, kind: 'primitive', ...inferPrimitive(values), nonEmpty };
}

function inferPrimitive(values: unknown[]): Pick<NestedNode, 'inferredType' | 'valueKind' | 'samples'> {
  const nonNull = values.filter((value) => value !== null && value !== undefined && value !== '');
  const samples = boundedSamples(nonNull);
  if (nonNull.length === 0) return { samples };

  const typeCounts = new Map<NonNullable<NestedNode['inferredType']>, number>();
  const kindSet = new Set<NonNullable<NestedNode['valueKind']>>();
  for (const value of nonNull) {
    typeCounts.set(classifyPrimitive(value), (typeCounts.get(classifyPrimitive(value)) ?? 0) + 1);
    kindSet.add(rawValueKind(value));
  }
  let inferredType: NestedNode['inferredType'] = 'string';
  let best = -1;
  for (const [type, count] of typeCounts) {
    if (count > best) {
      best = count;
      inferredType = type;
    }
  }
  const valueKind: NestedNode['valueKind'] = kindSet.size === 1 ? [...kindSet][0] : 'mixed';
  return { inferredType, valueKind, samples };
}

function classifyPrimitive(value: unknown): NonNullable<NestedNode['inferredType']> {
  if (value instanceof Date) return 'datetime';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'false') return 'boolean';
    if (isStrongDateTime(value) || isParseableByAnyFormat(value)) return 'datetime';
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return 'number';
  }
  return 'string';
}

function rawValueKind(value: unknown): NonNullable<NestedNode['valueKind']> {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

function boundedSamples(values: unknown[]): string[] {
  const samples: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (samples.length >= NESTED_NODE_SAMPLE_LIMIT) break;
    const text = truncateSample(value);
    if (seen.has(text)) continue;
    seen.add(text);
    samples.push(text);
  }
  return samples;
}

function truncateSample(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (text.length <= NESTED_SAMPLE_TRUNCATE) return text;
  return `${Array.from(text).slice(0, NESTED_SAMPLE_TRUNCATE).join('')}…`;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined
    || (typeof value === 'string' && value.trim() === '')
    || (Array.isArray(value) && value.length === 0);
}

function isStrongDateTime(value: string): boolean {
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value.trim());
}
