import { createHash, randomInt } from 'node:crypto';
import { basename, extname } from 'node:path';
import type {
  IdentityCandidate,
  InferredValueType,
  LocalDataColumnProfile,
  LocalDataMapping,
  LocalDataProfile,
  LocalDataRow,
  LocalDataSet,
  NestedNode,
  UeRecordType,
} from './types.js';
import type { LocalDataInput } from './input.js';
import { streamLocalDataRows } from './input.js';
import { buildNestedTree } from './flatten.js';
import { isParseableByAnyFormat, findFirstTimeFormat } from './time.js';

const UNIQUE_SAMPLE_LIMIT = 10_000;
const GLOBAL_UNIQUE_SAMPLE_LIMIT = 200_000;
const IDENTITY_MAX_LENGTH = 128;
const COLUMN_SAMPLE_LIMIT = 5;
const SAMPLE_TRUNCATE_LENGTH = 40;
const NESTED_TREE_SAMPLE_LIMIT = 1000;

/** Record types that target user profile tables (no #event_name; all non-track types). */
export const USER_PROFILE_TYPES: ReadonlySet<UeRecordType> = new Set<UeRecordType>([
  'user_set',
  'user_setOnce',
  'user_add',
  'user_unset',
  'user_del',
  'user_append',
  'user_uniq_append',
]);

export function isUserProfileType(recordType: string): boolean {
  return USER_PROFILE_TYPES.has(recordType as UeRecordType);
}

interface ColumnAccumulator {
  name: string;
  missing: number;
  nonMissing: number;
  types: Map<InferredValueType, number>;
  uniqueHashes: Set<string>;
  uniqueOverflow: boolean;
  timeParseCount: number;
  timeFormatCounts: Map<string, number>;
  samples: string[];
  sampleSet: Set<string>;
}

const ACCOUNT_NAMES = ['#account_id', 'account_id', 'accountid', 'user_id', 'userid', 'uid', 'member_id', '账号', '用户id', '账户id'];
const DISTINCT_NAMES = ['#distinct_id', 'distinct_id', 'distinctid', 'device_id', 'deviceid', 'visitor_id', 'anonymous_id', '设备id', '访客id'];
const TIME_NAMES = ['#time', 'time', 'timestamp', 'event_time', 'created_at', 'occurred_at', 'datetime', 'date', '时间', '事件时间', '发生时间', '创建时间', '下单时间', '订单时间'];
const EVENT_NAMES = ['#event_name', 'event_name', 'event', 'action', 'activity', '事件名', '事件名称', '事件', '行为', '动作'];
const TYPE_NAMES = ['#type', 'record_type', 'data_type', '操作类型'];

export interface ProfileLocalDataOptions {
  /** Collect bounded inspect samples per column. */
  collectSamples?: boolean;
  /** Fixed column names (headerless input); the first row is data. */
  headerNames?: string[];
  /** Headerless input without explicit names: auto-generate col_1..col_N. */
  noHeader?: boolean;
  /** NDJSON nested flatten rules. */
  flattenRules?: Record<string, string>;
  /** NDJSON/JSON: reservoir-sample raw records; CSV/TSV: reservoir-sample JSON-encoded object cells. */
  collectNestedTree?: boolean;
  delimiter?: string;
  encoding?: string;
  /** Stream every worksheet in file order instead of a single selected sheet. */
  mergeSheets?: boolean;
}

export async function profileLocalData(
  input: LocalDataInput,
  dataSet: LocalDataSet,
  sourceTimezone = 'Asia/Shanghai',
  options: ProfileLocalDataOptions = {},
): Promise<LocalDataProfile> {
  const columns = new Map<string, ColumnAccumulator>();
  const recognizedRecordTypes = new Set<string>();
  let uniqueSamples = 0;
  let rowCount = 0;
  const collectNestedTree = Boolean(
    options.collectNestedTree && (input.format === 'json' || input.format === 'jsonl'),
  );
  const collectDelimitedTree = Boolean(
    options.collectNestedTree && (input.format === 'csv' || input.format === 'tsv'),
  );
  let nestedObjects: unknown[] = [];
  let nestedSeen = 0;
  const delimitedNested = new Map<string, { seen: number; objects: unknown[] }>();

  await streamLocalDataRows(
    input,
    dataSet,
    (row) => {
      rowCount += 1;
      if (collectNestedTree && row !== null && typeof row === 'object' && !Array.isArray(row)) {
        nestedSeen += 1;
        if (nestedObjects.length < NESTED_TREE_SAMPLE_LIMIT) {
          nestedObjects.push(row);
        } else {
          const slot = randomInt(nestedSeen);
          if (slot < NESTED_TREE_SAMPLE_LIMIT) nestedObjects[slot] = row;
        }
      }
      for (const name of new Set([...columns.keys(), ...Object.keys(row)])) {
        let accumulator = columns.get(name);
        if (!accumulator) {
          accumulator = {
            name,
            missing: rowCount - 1,
            nonMissing: 0,
            types: new Map(),
            uniqueHashes: new Set(),
            uniqueOverflow: false,
            timeParseCount: 0,
            timeFormatCounts: new Map(),
            samples: [],
            sampleSet: new Set(),
          };
          columns.set(name, accumulator);
        }
        const value = row[name];
        if (isMissing(value)) {
          accumulator.missing += 1;
          continue;
        }
        accumulator.nonMissing += 1;
        const type = inferValueType(value);
        accumulator.types.set(type, (accumulator.types.get(type) ?? 0) + 1);
        const valueHash = hashValue(value);
        if (accumulator.uniqueHashes.has(valueHash)) {
          // Already counted without retaining raw values.
        } else if (accumulator.uniqueHashes.size < UNIQUE_SAMPLE_LIMIT && uniqueSamples < GLOBAL_UNIQUE_SAMPLE_LIMIT) {
          accumulator.uniqueHashes.add(valueHash);
          uniqueSamples += 1;
        } else {
          accumulator.uniqueOverflow = true;
        }
        if (options.collectSamples) recordSample(accumulator, value);
        if (collectDelimitedTree && typeof value === 'string' && value.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(value);
            if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
              let sampler = delimitedNested.get(name);
              if (!sampler) {
                sampler = { seen: 0, objects: [] };
                delimitedNested.set(name, sampler);
              }
              sampler.seen += 1;
              if (sampler.objects.length < NESTED_TREE_SAMPLE_LIMIT) {
                sampler.objects.push(parsed);
              } else {
                const slot = randomInt(sampler.seen);
                if (slot < NESTED_TREE_SAMPLE_LIMIT) sampler.objects[slot] = parsed;
              }
            }
          } catch { /* not a JSON object */ }
        }
        if (isParseableTime(value, matchesName(name, TIME_NAMES))) {
          accumulator.timeParseCount += 1;
          if (typeof value === 'string') {
            const format = findFirstTimeFormat(value);
            if (format) {
              accumulator.timeFormatCounts.set(format, (accumulator.timeFormatCounts.get(format) ?? 0) + 1);
            }
          }
        }
        if (matchesName(name, TYPE_NAMES)) {
          const normalized = normalizeRecordType(value);
          if (normalized) recognizedRecordTypes.add(normalized);
        }
      }
    },
    {
      delimiter: options.delimiter,
      encoding: options.encoding,
      headerNames: options.headerNames,
      noHeader: options.noHeader,
      flattenRules: options.flattenRules,
      mergeSheets: options.mergeSheets,
    },
  );

  const delimitedNestedTree = new Map<string, NestedNode[]>();
  for (const [columnName, sampler] of delimitedNested) {
    if (sampler.objects.length > 0) delimitedNestedTree.set(columnName, buildNestedTree(sampler.objects));
  }
  const columnProfiles: LocalDataColumnProfile[] = [];
  const timeFormatByColumn = new Map<string, string>();
  for (const column of columns.values()) {
    const profile = formatColumnProfile(column, rowCount, options.collectSamples ?? false);
    const nestedTree = delimitedNestedTree.get(column.name);
    if (nestedTree && nestedTree.length > 0) profile.nested_tree = nestedTree;
    columnProfiles.push(profile);
    const dominantFormat = dominantTimeFormat(column);
    if (dominantFormat) timeFormatByColumn.set(column.name, dominantFormat);
  }
  const identityCandidates = findIdentityCandidates(columnProfiles);
  const recommendedMapping = recommendMapping({
    input,
    dataSet,
    rowCount,
    columns: columnProfiles,
    recognizedRecordTypes,
    sourceTimezone,
    headerNames: options.headerNames,
    timeFormatByColumn,
  });
  const warnings = [...(recommendedMapping.warnings ?? [])];
  if (rowCount === 0) warnings.push('The selected data set contains no data rows.');

  return {
    version: 'ae-local-data-profile/v1',
    source: {
      format: input.format,
      size_bytes: input.sizeBytes,
      sha256: input.sha256,
    },
    data_set: dataSet,
    row_count: rowCount,
    column_count: columnProfiles.length,
    columns: columnProfiles,
    identity_candidates: identityCandidates,
    recommended_mapping: recommendedMapping,
    ue_eligible: Boolean(
      (recommendedMapping.account_id_field || recommendedMapping.distinct_id_field)
      && recommendedMapping.time.field,
    ),
    warnings,
    ...(collectNestedTree && nestedObjects.length > 0
      ? { nested_tree: buildNestedTree(nestedObjects) }
      : {}),
  };
}

export function normalizeAeName(input: string, fallback: string): string {
  let normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!normalized) normalized = fallback;
  if (!/^[a-z]/.test(normalized)) normalized = `field_${normalized}`;
  return normalized.slice(0, 50).replace(/_+$/g, '') || fallback;
}

export function inferValueType(value: unknown): InferredValueType {
  if (isMissing(value)) return 'null';
  if (value instanceof Date) return 'datetime';
  if (Array.isArray(value)) return 'list';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value !== null && typeof value === 'object') return 'object';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (isStrongDateTime(value)) return 'datetime';
    if (normalized === 'true' || normalized === 'false') return 'boolean';
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return 'number';
    // JSON-encoded object/array values (common in CSV) are recognized by shape,
    // mirroring the standalone tool's looksLikeObject / looksLikeArray inference.
    if (looksLikeJsonContainer(value)) {
      if (looksLikeArray(value)) return 'list';
      if (looksLikeObject(value)) return 'object';
    }
  }
  return 'string';
}

export function isMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function recommendMapping(input: {
  input: LocalDataInput;
  dataSet: LocalDataSet;
  rowCount: number;
  columns: LocalDataColumnProfile[];
  recognizedRecordTypes: Set<string>;
  sourceTimezone: string;
  headerNames?: string[];
  timeFormatByColumn: Map<string, string>;
}): LocalDataMapping {
  const account = findCandidate(input.columns, ACCOUNT_NAMES);
  const distinct = findCandidate(input.columns, DISTINCT_NAMES);
  const time = findTimeCandidate(input.columns);
  const event = findCandidate(input.columns, EVENT_NAMES);
  const recordType = findCandidate(input.columns, TYPE_NAMES);
  const identity = account ?? distinct;

  const recognized = [...input.recognizedRecordTypes];
  const hasTrack = recognized.includes('track');
  const hasProfile = recognized.some(isUserProfileType);

  let mode: LocalDataMapping['mode'];
  let confidence: LocalDataMapping['confidence'];
  if (recognized.length > 0) {
    if (hasTrack && hasProfile) {
      mode = 'mixed';
    } else if (hasProfile) {
      mode = 'user_set';
    } else {
      mode = 'track';
    }
    confidence = 'high';
  } else if (event) {
    mode = 'track';
    confidence = 'high';
  } else if (identity && identity.unique_ratio < 0.9 && input.rowCount > 1) {
    mode = 'track';
    confidence = 'medium';
  } else {
    mode = 'user_set';
    confidence = identity ? 'medium' : 'low';
  }

  const warnings: string[] = [];
  if (!account && !distinct) warnings.push('No real account or distinct ID field was identified.');
  if (!time) warnings.push('No real time field with parseable values was identified.');
  if (confidence === 'low') warnings.push('The UE classification has low confidence and requires review.');
  if (recordType && input.recognizedRecordTypes.size === 0) {
    warnings.push('A record-type column exists, but its values are not recognized as track or a user profile type.');
  }
  if (mode === 'track' && !event) {
    warnings.push('No event-name column was found; review the generated default event name.');
  }

  const reserved = new Set([account?.name, distinct?.name, time?.name, event?.name, recordType?.name].filter(Boolean));
  const usedTargets = new Set<string>();
  const properties = input.columns
    .filter((column) => !reserved.has(column.name))
    .map((column, index) => {
      const baseTarget = normalizeAeName(column.name, `field_${index + 1}`);
      let target = baseTarget;
      let suffix = 2;
      while (usedTargets.has(target)) target = `${baseTarget.slice(0, 46)}_${suffix++}`;
      usedTargets.add(target);
      const type = mappingType(column.inferred_type);
      // object/list columns are inferred from JSON-encoded text (CSV cells, flattened NDJSON),
      // which arrives stringified; `transform: 'json'` restores the native container. It is a
      // no-op when the value already arrived as a native object/array.
      return {
        source: column.name,
        target,
        type,
        ...(type === 'object' || type === 'list' ? { transform: 'json' as const } : {}),
      };
    });

  const defaultEventSource = input.dataSet.kind === 'sheet'
    ? input.dataSet.label
    : basename(input.input.filePath, extname(input.input.filePath));
  return {
    version: 'ae-local-data-mapping/v1',
    source: {
      sha256: input.input.sha256,
      format: input.input.format,
      data_set: input.dataSet.id,
    },
    mode,
    confidence,
    ...(account ? { account_id_field: account.name } : {}),
    ...(distinct ? { distinct_id_field: distinct.name } : {}),
    time: {
      field: time?.name ?? '',
      format: 'auto',
      source_timezone: input.sourceTimezone,
    },
    ...(time ? { time_format: input.timeFormatByColumn.get(time.name) } : {}),
    ...(input.headerNames && input.headerNames.length > 0 ? { headers: input.headerNames } : {}),
    ...(recordType ? { record_type_field: recordType.name } : {}),
    ...(event ? { event_name_field: event.name } : {}),
    ...(mode !== 'user_set' && !event
      ? { default_event_name: normalizeAeName(defaultEventSource, 'local_event') }
      : {}),
    properties,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

function formatColumnProfile(
  column: ColumnAccumulator,
  rowCount: number,
  includeSamples: boolean,
): LocalDataColumnProfile {
  const nonNullTypes = [...column.types.entries()]
    .filter(([type]) => type !== 'null')
    .sort((left, right) => right[1] - left[1]);
  const inferred = nonNullTypes.length === 0
    ? 'unknown'
    : nonNullTypes.length === 1
      ? nonNullTypes[0][0] as Exclude<InferredValueType, 'null'>
      : compatibleTypes(nonNullTypes.map(([type]) => type))
        ? nonNullTypes[0][0] as Exclude<InferredValueType, 'null'>
        : 'mixed';
  // ID-like columns (…_id/_key/_code/_no/_num, "id", or any "*id") stay strings even when
  // every value is numeric, preserving leading zeros and full precision.
  const finalType = inferred === 'number' && idLikeColumn(column.name) ? 'string' : inferred;
  return {
    name: column.name,
    inferred_type: finalType,
    missing_count: column.missing,
    missing_ratio: ratio(column.missing, rowCount),
    unique_count: column.uniqueHashes.size,
    unique_ratio: ratio(column.uniqueHashes.size, column.nonMissing),
    unique_count_approximate: column.uniqueOverflow,
    time_parse_count: column.timeParseCount,
    time_parse_ratio: ratio(column.timeParseCount, column.nonMissing),
    ...(includeSamples ? { samples: column.samples } : {}),
  };
}

function findCandidate(columns: LocalDataColumnProfile[], names: string[]): LocalDataColumnProfile | undefined {
  return columns.find((column) => matchesName(column.name, names));
}

/** Every column whose name matches account/distinct patterns, with the kind the name implies. */
function findIdentityCandidates(columns: LocalDataColumnProfile[]): IdentityCandidate[] {
  return columns
    .filter((column) => matchesName(column.name, ACCOUNT_NAMES) || matchesName(column.name, DISTINCT_NAMES))
    .map((column) => ({
      name: column.name,
      kind: matchesName(column.name, DISTINCT_NAMES) ? 'distinct' : 'account',
      unique_ratio: column.unique_ratio,
      missing_ratio: column.missing_ratio,
    }));
}

function findTimeCandidate(columns: LocalDataColumnProfile[]): LocalDataColumnProfile | undefined {
  const named = findCandidate(columns, TIME_NAMES);
  if (named && named.time_parse_ratio >= 0.8) return named;
  return columns
    .filter((column) => column.time_parse_ratio >= 0.95)
    .sort((left, right) => right.time_parse_ratio - left.time_parse_ratio)[0];
}

function matchesName(input: string, names: string[]): boolean {
  const normalized = input.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return names.some((name) => normalized === name.toLowerCase());
}

/** Columns whose names denote identifiers/keys/codes should stay strings even when numeric. */
function idLikeColumn(name: string): boolean {
  const low = name.toLowerCase().trim();
  return /_(id|key|code|no|num)$/i.test(low) || low === 'id' || low.endsWith('id');
}

function looksLikeJsonContainer(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return (first === '{' && last === '}') || (first === '[' && last === ']');
}

function looksLikeObject(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function looksLikeArray(value: string): boolean {
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}

function normalizeRecordType(value: unknown): UeRecordType | undefined {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/^#/, '').replace(/[-_\s]+/g, '');
  const aliases: Record<string, UeRecordType> = {
    track: 'track',
    event: 'track',
    userset: 'user_set',
    user: 'user_set',
    usersetonce: 'user_setOnce',
    useradd: 'user_add',
    userunset: 'user_unset',
    userdel: 'user_del',
    userappend: 'user_append',
    useruniqappend: 'user_uniq_append',
  };
  return aliases[normalized];
}

function mappingType(type: LocalDataColumnProfile['inferred_type']): 'number' | 'string' | 'boolean' | 'datetime' | 'list' | 'object' {
  if (type === 'datetime') return 'datetime';
  if (type === 'number' || type === 'boolean' || type === 'list' || type === 'object') return type;
  return 'string';
}

function compatibleTypes(types: InferredValueType[]): boolean {
  const set = new Set(types);
  return set.size <= 1 || (set.size === 2 && set.has('string') && set.has('datetime'));
}

function hashValue(value: unknown): string {
  let serialized: string;
  try {
    serialized = value instanceof Date ? value.toISOString() : JSON.stringify(value);
  } catch {
    serialized = String(value);
  }
  return createHash('sha256').update(serialized).digest('hex');
}

function isParseableTime(value: unknown, allowNumeric: boolean): boolean {
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (typeof value === 'number') {
    return allowNumeric && Number.isFinite(value) && (value > 1e9 || (value >= 1 && value <= 2_958_465));
  }
  if (typeof value !== 'string') return false;
  // Numeric epoch strings (10-digit seconds or 13-digit milliseconds) are recognized by value,
  // independent of the column name: a header like `order_time` is as valid as `event_time`.
  if (/^\d{10}(?:\d{3})?$/.test(value.trim())) return true;
  return isStrongDateTime(value) || isParseableByAnyFormat(value);
}

function isStrongDateTime(value: string): boolean {
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value.trim());
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(6));
}

function recordSample(accumulator: ColumnAccumulator, value: unknown): void {
  if (accumulator.samples.length >= COLUMN_SAMPLE_LIMIT) return;
  const text = truncateSample(value);
  if (accumulator.sampleSet.has(text)) return;
  accumulator.sampleSet.add(text);
  accumulator.samples.push(text);
}

function truncateSample(value: unknown): string {
  const text = sampleText(value);
  if (text.length <= SAMPLE_TRUNCATE_LENGTH) return text;
  // Array.from keeps the slice surrogate-safe.
  return `${Array.from(text).slice(0, SAMPLE_TRUNCATE_LENGTH).join('')}…`;
}

function sampleText(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Dominant strptime format for a column, when a single format covers ≥90% of parseable values. */
function dominantTimeFormat(column: ColumnAccumulator): string | undefined {
  if (column.timeFormatCounts.size === 0) return undefined;
  const total = [...column.timeFormatCounts.values()].reduce((sum, count) => sum + count, 0);
  let best: string | undefined;
  let bestCount = 0;
  for (const [format, count] of column.timeFormatCounts) {
    if (count > bestCount) {
      best = format;
      bestCount = count;
    }
  }
  return best && bestCount >= total * 0.9 ? best : undefined;
}

export { IDENTITY_MAX_LENGTH, normalizeRecordType };
