import { createHash, randomInt } from 'node:crypto';
import { basename, extname } from 'node:path';
import type {
  IdentityCandidate,
  InferredValueType,
  LocalDataCellIssue,
  LocalDataColumnProfile,
  LocalDataDuplicateKeyGroup,
  LocalDataDuplicateKeyReport,
  LocalDataMapping,
  LocalDataNumericSummary,
  LocalDataProfile,
  LocalDataRow,
  LocalDataSet,
  LocalDataSummaryRow,
  LocalDataValueFrequency,
  NestedNode,
  UeRecordType,
} from './types.js';
import { MAPPING_VERSION } from './types.js';
import type { LocalDataInput } from './input.js';
import { streamLocalDataRows, cellIssueWarnings, createXlsxStructureCollector, xlsxStructureReport, xlsxStructureWarnings } from './input.js';
import { buildColumnNestedTree, buildNestedTree } from './flatten.js';
import { isParseableByAnyFormat, findFirstTimeFormat } from './time.js';
import { isPrivateIp, isValidIp, isValidUuid } from './field-spec.js';

const UNIQUE_SAMPLE_LIMIT = 10_000;
const GLOBAL_UNIQUE_SAMPLE_LIMIT = 200_000;
const IDENTITY_MAX_LENGTH = 128;
const COLUMN_SAMPLE_LIMIT = 5;
const SAMPLE_TRUNCATE_LENGTH = 40;
/** Distinct values tracked per column for the frequency table; past it the table is dropped, not truncated. */
const VALUE_FREQUENCY_LIMIT = 200;
/** Frequency rows reported — enough to show a whole enum without turning the profile into a value dump. */
const VALUE_FREQUENCY_TOP = 10;
/** Numeric values retained per column for the quantiles; past it they are reservoir-sampled. */
const NUMERIC_SAMPLE_LIMIT = 5_000;
/** Summary-row candidates retained. A file holds a handful of total rows; a longer list means the scan is matching something else. */
const SUMMARY_ROW_CANDIDATE_LIMIT = 50;
/** Row ordinals named in the warning; the rest stay in `summary_rows`. */
const SUMMARY_ROW_WARNING_LIMIT = 10;
/** A longer cell is prose that happens to begin with 合计, not a row label. */
const SUMMARY_LABEL_MAX_LENGTH = 24;
/** Matched as a prefix: a real label is often scoped (`小计（华东）`). */
const SUMMARY_LABELS_CJK = ['合计', '总计', '小计', '汇总'];
/** Matched against the whole cell: a note beginning `summary of …` is not a total row. */
const SUMMARY_LABELS_LATIN = new Set(['total', 'totals', 'subtotal', 'sub total', 'grand total', 'sum']);
/** Distinct business keys tracked; past it a repeat of a key first seen later cannot be recognized. */
const DUPLICATE_KEY_TRACK_LIMIT = 200_000;
/** Groups reported, most repeated first. A key repeated across the whole file needs one example, not thousands. */
const DUPLICATE_GROUP_LIMIT = 20;
/** Row ordinals kept per group — enough to open the file at the repeat and compare the two rows. */
const DUPLICATE_GROUP_ROW_LIMIT = 10;
/** Groups named in the warning; the rest stay in `duplicate_keys.groups`. */
const DUPLICATE_WARNING_GROUP_LIMIT = 3;
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
  uuidValidCount: number;
  ipValidCount: number;
  lanIpCount: number;
  samples: string[];
  sampleSet: Set<string>;
  /** Truncated value → rows carrying it, tracked up to VALUE_FREQUENCY_LIMIT distinct values. */
  valueCounts: Map<string, number>;
  valueCountsOverflow: boolean;
  numericCount: number;
  numericSum: number;
  numericMin: number;
  numericMax: number;
  /** Reservoir of numeric values for the quantiles; holds all of them below NUMERIC_SAMPLE_LIMIT. */
  numericSamples: number[];
  /** Column named like an identity or a time field, so a row that leaves it empty carries no observation. */
  keyLike: boolean;
}

/**
 * A row held back for the summary-row check. Whether its numbers are column totals can only be
 * decided once the stream ends, so the row's numeric cells travel with it.
 */
interface SummaryRowCandidate {
  row: number;
  labelColumn?: string;
  numericCells: Array<[string, number]>;
}

const ACCOUNT_NAMES = ['#account_id', 'account_id', 'accountid', 'user_id', 'userid', 'uid', 'member_id', '账号', '用户id', '账户id'];
const DISTINCT_NAMES = ['#distinct_id', 'distinct_id', 'distinctid', 'device_id', 'deviceid', 'visitor_id', 'anonymous_id', '设备id', '访客id'];
const TIME_NAMES = ['#time', 'time', 'timestamp', 'event_time', 'created_at', 'occurred_at', 'datetime', 'date', '时间', '事件时间', '发生时间', '创建时间', '下单时间', '订单时间'];
const EVENT_NAMES = ['#event_name', 'event_name', 'event', 'action', 'activity', '事件名', '事件名称', '事件', '行为', '动作'];
const TYPE_NAMES = ['#type', 'record_type', 'data_type', '操作类型'];
const IP_NAMES = ['#ip', 'ip', 'ip_address', 'ipaddress', 'client_ip', 'clientip', 'remote_addr', 'remoteaddr', 'ip地址', '客户端ip'];
const UUID_NAMES = ['#uuid', 'uuid', 'event_uuid', 'eventuuid', 'request_uuid', 'requestuuid', '唯一标识', '唯一id'];

export interface ProfileLocalDataOptions {
  /** Collect bounded inspect samples per column. */
  collectSamples?: boolean;
  /** Fixed column names (headerless input); the first row is data. */
  headerNames?: string[];
  /** Headerless input without explicit names: auto-generate col_1..col_N. */
  noHeader?: boolean;
  /** Nested flatten rules (all formats): { outColumn: 'dot.path' }. */
  flattenRules?: Record<string, string>;
  /** NDJSON/JSON: reservoir-sample raw records; CSV/TSV/Excel: reservoir-sample JSON-encoded object cells. */
  collectNestedTree?: boolean;
  delimiter?: string;
  encoding?: string;
  /** Stream every worksheet in file order instead of a single selected sheet. */
  mergeSheets?: boolean;
  /** Emit the ragged-row stderr warning (default true). Internal passes suppress it. */
  warnRagged?: boolean;
  /** Delimited/Excel: leading title/banner rows discarded before the header row is interpreted. */
  skipRows?: number;
  /** XLSX: copy each merged block's value into the cells its own range covers. */
  fillMergedCells?: boolean;
  /** XLSX: leave rows hidden in the source worksheet out of the profile. */
  excludeHiddenRows?: boolean;
  /**
   * Columns whose combined value identifies one observation, for the duplicate-key scan. `convert`
   * passes the mapping's own identity/time/event columns; without it the scan falls back to matching
   * column names, and reports which columns it used.
   */
  duplicateKeyFields?: string[];
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
    options.collectNestedTree
      && (input.format === 'csv' || input.format === 'tsv' || input.format === 'xlsx' || input.format === 'xls'),
  );
  let nestedObjects: unknown[] = [];
  let nestedSeen = 0;
  const delimitedNested = new Map<string, { seen: number; values: unknown[] }>();
  const excelDateColumns = new Set<string>();
  const cellIssues = new Map<LocalDataCellIssue, Map<string, number>>();
  // Merged blocks and hidden rows/columns are XLSX-only facts that live outside the row data; the
  // reader collects them in its own pass and reports them here.
  const xlsxStructure = input.format === 'xlsx' ? createXlsxStructureCollector() : undefined;
  const summaryCandidates: SummaryRowCandidate[] = [];
  let summaryCandidatesTruncated = false;
  // The key columns must be settled while the first row is in hand — the profile is a single pass,
  // so a column decided from a post-stream verdict would arrive too late to compare anything.
  let duplicateKeys: DuplicateKeyTracker | undefined;
  let duplicateKeysResolved = false;

  await streamLocalDataRows(
    input,
    dataSet,
    (row, rowNumber) => {
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
      // Summary-row state for this row: the label it may carry, its numbers, and whether it left
      // every identity/time column empty — a row with nothing to attach an observation to.
      let labelColumn: string | undefined;
      let numericCells: Array<[string, number]> | undefined;
      let keyColumnsPresent = false;
      let keyColumnsFilled = false;
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
            uuidValidCount: 0,
            ipValidCount: 0,
            lanIpCount: 0,
            samples: [],
            sampleSet: new Set(),
            valueCounts: new Map(),
            valueCountsOverflow: false,
            numericCount: 0,
            numericSum: 0,
            numericMin: Number.POSITIVE_INFINITY,
            numericMax: Number.NEGATIVE_INFINITY,
            numericSamples: [],
            keyLike: matchesName(name, ACCOUNT_NAMES)
              || matchesName(name, DISTINCT_NAMES)
              || matchesName(name, TIME_NAMES),
          };
          columns.set(name, accumulator);
        }
        const value = row[name];
        if (accumulator.keyLike) {
          keyColumnsPresent = true;
          if (!isMissing(value)) keyColumnsFilled = true;
        }
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
        if (options.collectSamples) {
          recordSample(accumulator, value);
          recordValueFrequency(accumulator, value);
        }
        // Numeric totals are kept on both paths because a column's sum is what a summary row is
        // recognized by; only the reservoir behind the quantiles is inspect-only.
        if (type === 'number') {
          const numeric = Number(value);
          recordNumeric(accumulator, numeric, options.collectSamples === true);
          if (Number.isFinite(numeric)) (numericCells ??= []).push([name, numeric]);
        } else if (labelColumn === undefined && matchesSummaryLabel(value)) {
          labelColumn = name;
        }
        if (collectDelimitedTree && typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(value);
              if (parsed !== null && typeof parsed === 'object') {
                let sampler = delimitedNested.get(name);
                if (!sampler) {
                  sampler = { seen: 0, values: [] };
                  delimitedNested.set(name, sampler);
                }
                sampler.seen += 1;
                if (sampler.values.length < NESTED_TREE_SAMPLE_LIMIT) {
                  sampler.values.push(parsed);
                } else {
                  const slot = randomInt(sampler.seen);
                  if (slot < NESTED_TREE_SAMPLE_LIMIT) sampler.values[slot] = parsed;
                }
              }
            } catch { /* not a JSON object/array */ }
          }
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
        if (matchesName(name, UUID_NAMES) && isValidUuid(value)) accumulator.uuidValidCount += 1;
        if (matchesName(name, IP_NAMES) && isValidIp(value)) {
          accumulator.ipValidCount += 1;
          if (isPrivateIp(value)) accumulator.lanIpCount += 1;
        }
        if (matchesName(name, TYPE_NAMES)) {
          const normalized = normalizeRecordType(value);
          if (normalized) recognizedRecordTypes.add(normalized);
        }
      }
      // A row is a summary-line candidate when it labels itself one, or when it carries numbers
      // while every identity/time column in the file is empty. Whether those numbers are the
      // column's total is settled after the stream, so the row is retained until then.
      if (labelColumn !== undefined || (keyColumnsPresent && !keyColumnsFilled && numericCells !== undefined)) {
        if (summaryCandidates.length < SUMMARY_ROW_CANDIDATE_LIMIT) {
          summaryCandidates.push({ row: rowNumber, labelColumn, numericCells: numericCells ?? [] });
        } else {
          summaryCandidatesTruncated = true;
        }
      }
      if (!duplicateKeysResolved) {
        duplicateKeysResolved = true;
        const keyColumns = resolveDuplicateKeyColumns(Object.keys(row), options.duplicateKeyFields);
        if (keyColumns) duplicateKeys = createDuplicateKeyTracker(keyColumns);
      }
      if (duplicateKeys) recordDuplicateKey(duplicateKeys, row, rowNumber);
    },
    {
      delimiter: options.delimiter,
      encoding: options.encoding,
      headerNames: options.headerNames,
      noHeader: options.noHeader,
      flattenRules: options.flattenRules,
      mergeSheets: options.mergeSheets,
      excelDateColumns,
      cellIssues,
      warnRagged: options.warnRagged,
      skipRows: options.skipRows,
      xlsxStructure,
      fillMergedCells: options.fillMergedCells,
      excludeHiddenRows: options.excludeHiddenRows,
    },
  );

  const delimitedNestedTree = new Map<string, NestedNode[]>();
  for (const [columnName, sampler] of delimitedNested) {
    if (sampler.values.length > 0) delimitedNestedTree.set(columnName, buildColumnNestedTree(sampler.values));
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
  const nestedTree = collectNestedTree && nestedObjects.length > 0
    ? buildNestedTree(nestedObjects)
    : undefined;
  const identityCandidates = findIdentityCandidates(columnProfiles);
  const recommendedMapping = recommendMapping({
    input,
    dataSet,
    rowCount,
    columns: columnProfiles,
    recognizedRecordTypes,
    sourceTimezone,
    headerNames: options.headerNames,
    skipRows: options.skipRows,
    fillMergedCells: options.fillMergedCells,
    excludeHiddenRows: options.excludeHiddenRows,
    timeFormatByColumn,
    nestedTree,
  });
  const warnings = [...(recommendedMapping.warnings ?? [])];
  for (const column of columns.values()) {
    if (matchesName(column.name, UUID_NAMES) && column.nonMissing > 0) {
      const invalid = column.nonMissing - column.uuidValidCount;
      if (invalid > 0) warnings.push(`${column.name}: ${invalid} non-empty value(s) are not standard 36-character UUIDs; #uuid requires the standard UUID format.`);
    }
    if (matchesName(column.name, IP_NAMES) && column.nonMissing > 0) {
      const invalid = column.nonMissing - column.ipValidCount;
      if (invalid > 0) warnings.push(`${column.name}: ${invalid} non-empty value(s) are not valid IPv4 or IPv6 addresses.`);
      if (column.lanIpCount > 0) warnings.push(`${column.name}: ${column.lanIpCount} value(s) are private/LAN IP addresses; AE cannot resolve geo information for them.`);
    }
  }
  if (excelDateColumns.size > 0) {
    // Before these cells were read through the workbook's number formats they profiled as plain
    // numbers, so an earlier run may have mapped them as such — and an AE property type cannot be
    // changed once received. Name the columns so the agent can ask instead of assuming.
    warnings.push(`${[...excelDateColumns].join(', ')}: read as date/time value(s) from the Excel number format rather than as Excel serial numbers. If these columns were uploaded to AE before, they may have been received as number properties, whose type is now locked; confirm with the user before mapping them.`);
  }
  // These cells read as missing, so `missing_ratio` already moved; the warning is what explains it.
  warnings.push(...cellIssueWarnings(cellIssues));
  // A merged block or a hidden row is invisible in the profiled rows themselves: the column simply
  // looks sparse, or the row count is simply higher than the user expects.
  if (xlsxStructure) warnings.push(...xlsxStructureWarnings(xlsxStructure));
  const structureReport = xlsxStructure ? xlsxStructureReport(xlsxStructure) : undefined;
  // A total row is invisible in the profile otherwise: it inflates the record count by one and the
  // column's own sum by a factor of two, and both still look like ordinary data.
  const summaryRows = confirmSummaryRows(summaryCandidates, columns);
  if (summaryRows.length > 0) warnings.push(summaryRowWarning(summaryRows, summaryCandidatesTruncated));
  // A repeated key is invisible in the profile otherwise, and AE has no way to un-send an event once
  // the receiver has accepted it — so the finding is only useful before the upload, never after.
  const duplicateKeyReport = duplicateKeys ? buildDuplicateKeyReport(duplicateKeys) : undefined;
  if (duplicateKeyReport) warnings.push(duplicateKeyWarning(duplicateKeyReport));
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
    ...(nestedTree ? { nested_tree: nestedTree } : {}),
    ...(structureReport ? { xlsx_structure: structureReport } : {}),
    ...(summaryRows.length > 0 ? { summary_rows: summaryRows } : {}),
    ...(duplicateKeyReport ? { duplicate_keys: duplicateKeyReport } : {}),
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
  /** Carried into the mapping so a later convert reads the same rows inspect profiled. */
  skipRows?: number;
  /** Carried into the mapping so a later convert treats merged blocks and hidden rows identically. */
  fillMergedCells?: boolean;
  excludeHiddenRows?: boolean;
  timeFormatByColumn: Map<string, string>;
  /** NDJSON/JSON record-root tree for per-key flatten recommendations. */
  nestedTree?: NestedNode[];
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
  const recordRoots = new Map<string, NestedNode>();
  for (const node of input.nestedTree ?? []) recordRoots.set(node.name, node);

  const { properties, flattenRules } = recommendProperties(input.columns, reserved, recordRoots, warnings);

  const defaultEventSource = input.dataSet.kind === 'sheet'
    ? input.dataSet.label
    : basename(input.input.filePath, extname(input.input.filePath));
  return {
    version: MAPPING_VERSION,
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
    ...(input.skipRows ? { skip_rows: input.skipRows } : {}),
    ...(input.fillMergedCells ? { fill_merged_cells: true } : {}),
    ...(input.excludeHiddenRows ? { exclude_hidden_rows: true } : {}),
    ...(recordType ? { record_type_field: recordType.name } : {}),
    ...(event ? { event_name_field: event.name } : {}),
    ...(mode !== 'user_set' && !event
      ? { default_event_name: normalizeAeName(defaultEventSource, 'local_event') }
      : {}),
    ...(Object.keys(flattenRules).length > 0 ? { flatten_rules: flattenRules } : {}),
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
  const profile: LocalDataColumnProfile = {
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
  // Both carry values read out of the file, so they follow `samples` and stay out of the convert
  // manifest. The distribution is reported only for a column that is actually numeric: the sum of a
  // numeric user ID would be arithmetic on an identifier.
  if (includeSamples) {
    const frequency = formatValueFrequency(column);
    if (frequency) profile.value_frequency = frequency;
    if (finalType === 'number') {
      const summary = formatNumericSummary(column);
      if (summary) profile.numeric_summary = summary;
    }
  }
  return profile;
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

/** Recommendation accumulator shared across one column's flatten decisions. */
interface RecommendationState {
  properties: LocalDataMapping['properties'];
  flattenRules: Record<string, string>;
  usedTargets: Set<string>;
  warnings: string[];
  claim(desired: string): string;
}

/**
 * Recommend properties (plus any flatten rules) from the profile columns. A column with a nested
 * tree is decided per field: single-level containers are kept whole with declared sub-properties;
 * deeper containers collapse to their last all-scalar level. Columns without a tree map directly.
 */
function recommendProperties(
  columns: LocalDataColumnProfile[],
  reserved: Set<string | undefined>,
  recordRoots: Map<string, NestedNode>,
  warnings: string[],
): { properties: LocalDataMapping['properties']; flattenRules: Record<string, string> } {
  const properties: LocalDataMapping['properties'] = [];
  const flattenRules: Record<string, string> = {};
  const usedTargets = new Set<string>();
  const claim = (desired: string): string => {
    let target = desired;
    let suffix = 2;
    while (usedTargets.has(target)) target = `${desired.slice(0, 46)}_${suffix++}`;
    usedTargets.add(target);
    return target;
  };
  const state: RecommendationState = { properties, flattenRules, usedTargets, warnings, claim };

  columns
    .filter((column) => !reserved.has(column.name))
    .forEach((column, index) => {
      const baseName = normalizeAeName(column.name, `field_${index + 1}`);
      const valueNode = columnValueNode(column, recordRoots);
      if (!valueNode) {
        const type = mappingType(column.inferred_type);
        const target = claim(baseName);
        properties.push({ source: column.name, target, type, ...(isContainerType(type) ? { transform: 'json' as const } : {}) });
        return;
      }
      if (valueNode.kind === 'primitive') {
        const type = mappingType(valueNode.inferredType ?? column.inferred_type);
        const target = claim(baseName);
        properties.push({ source: column.name, target, type });
        return;
      }
      if (valueNode.kind === 'object') {
        recommendObject(state, baseName, column.name, valueNode.children ?? [], column.name);
        return;
      }
      recommendArray(state, baseName, column.name, valueNode, column.name);
    });

  return { properties, flattenRules };
}

/** Resolve a column's nested shape: the NDJSON record-root node, or the delimited cell tree. */
function columnValueNode(column: LocalDataColumnProfile, recordRoots: Map<string, NestedNode>): NestedNode | undefined {
  const recordNode = recordRoots.get(column.name);
  if (recordNode) return recordNode;
  const tree = column.nested_tree;
  if (!tree || tree.length === 0) return undefined;
  if (tree.length === 1 && tree[0].kind === 'array') return tree[0];
  return { path: '', name: column.name, kind: 'object', children: tree, nonEmpty: true };
}

function isScalarNode(node: NestedNode): boolean {
  return node.kind === 'primitive' || (node.kind === 'array' && node.elementKind === 'primitive');
}

function isContainerType(type: string): boolean {
  return type === 'object' || type === 'list' || type === 'array_row';
}

function scalarPropType(node: NestedNode): LocalDataMapping['properties'][number]['type'] {
  if (node.kind === 'array') return 'list';
  switch (node.inferredType) {
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'datetime': return 'datetime';
    default: return 'string';
  }
}

function snakeSegment(name: string): string {
  return normalizeAeName(name, 'field');
}

/**
 * Recommend one container object. If every child is scalar (or a scalar array), the object is kept
 * whole with one `parent.child` declaration per child. Otherwise this level collapses into the
 * flattened name prefix and every child is decided independently: scalars flatten to top-level
 * columns, objects recurse, and arrays recurse.
 */
function recommendObject(
  state: RecommendationState,
  prefix: string,
  dotPath: string,
  children: NestedNode[],
  columnName: string,
): void {
  const hasComposite = children.some((child) => child.kind === 'object' || (child.kind === 'array' && child.elementKind === 'object'));
  if (!hasComposite) {
    const parentTarget = state.claim(prefix);
    // A kept container reads its source column directly only at the top level; a nested kept
    // subtree is materialized from its dot path into a flatten out-column named after the prefix.
    const source = dotPath === columnName ? columnName : parentTarget;
    if (source !== columnName) state.flattenRules[parentTarget] = dotPath;
    state.properties.push({ source, target: parentTarget, type: 'object', transform: 'json' });
    for (const child of children) {
      state.properties.push({ source: parentTarget, target: `${parentTarget}.${snakeSegment(child.name)}`, type: scalarPropType(child) });
    }
    return;
  }
  for (const child of children) {
    const childPrefix = `${prefix}_${snakeSegment(child.name)}`;
    const childDotPath = `${dotPath}.${child.name}`;
    if (isScalarNode(child)) {
      const target = state.claim(childPrefix);
      state.flattenRules[target] = childDotPath;
      state.properties.push({ source: target, target, type: scalarPropType(child) });
    } else if (child.kind === 'object') {
      recommendObject(state, childPrefix, childDotPath, child.children ?? [], columnName);
    } else {
      recommendArray(state, childPrefix, childDotPath, child, columnName);
    }
  }
}

/**
 * Recommend one array. Scalar arrays become a `list` leaf; object arrays become an `array_row`
 * with one scalar sub-property per element field. A nested element field (object/array) is kept
 * inside the array data but not declared — array-element flattening is not yet supported — and is
 * warned about so it is never silently dropped.
 */
function recommendArray(
  state: RecommendationState,
  prefix: string,
  dotPath: string,
  node: NestedNode,
  columnName: string,
): void {
  if (node.elementKind !== 'object') {
    const target = state.claim(prefix);
    const source = dotPath === columnName ? columnName : target;
    if (source !== columnName) state.flattenRules[target] = dotPath;
    state.properties.push({ source, target, type: 'list', transform: 'json' });
    return;
  }
  const parentTarget = state.claim(prefix);
  const source = dotPath === columnName ? columnName : parentTarget;
  if (source !== columnName) state.flattenRules[parentTarget] = dotPath;
  state.properties.push({ source, target: parentTarget, type: 'array_row', transform: 'json' });
  for (const field of node.children ?? []) {
    if (isScalarNode(field)) {
      state.properties.push({ source: parentTarget, target: `${parentTarget}.${snakeSegment(field.name)}`, type: scalarPropType(field) });
    } else {
      state.warnings.push(`${dotPath} element field "${field.name}" is nested; it stays inside the ${parentTarget} array data and is not declared as a sub-property (array-element flattening is not yet supported).`);
    }
  }
}

function mappingType(
  type: LocalDataColumnProfile['inferred_type'] | NonNullable<NestedNode['inferredType']>,
): 'number' | 'string' | 'boolean' | 'datetime' | 'list' | 'object' | 'array_row' {
  if (type === 'datetime') return 'datetime';
  if (type === 'number' || type === 'boolean' || type === 'object' || type === 'list') return type;
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

/**
 * Counts a value under its truncated text. Once a column shows more distinct values than the
 * budget, counting stops being useful — a column with thousands of distinct values has no
 * meaningful "most frequent" — so the column is flagged and its table dropped rather than reported
 * from a partial count that would name whichever values happened to appear first.
 */
function recordValueFrequency(accumulator: ColumnAccumulator, value: unknown): void {
  if (accumulator.valueCountsOverflow) return;
  const text = truncateSample(value);
  const seen = accumulator.valueCounts.get(text);
  if (seen !== undefined) {
    accumulator.valueCounts.set(text, seen + 1);
    return;
  }
  if (accumulator.valueCounts.size >= VALUE_FREQUENCY_LIMIT) {
    accumulator.valueCountsOverflow = true;
    accumulator.valueCounts.clear();
    return;
  }
  accumulator.valueCounts.set(text, 1);
}

function recordNumeric(accumulator: ColumnAccumulator, numeric: number, retainForQuantiles: boolean): void {
  if (!Number.isFinite(numeric)) return;
  accumulator.numericCount += 1;
  accumulator.numericSum += numeric;
  if (numeric < accumulator.numericMin) accumulator.numericMin = numeric;
  if (numeric > accumulator.numericMax) accumulator.numericMax = numeric;
  if (!retainForQuantiles) return;
  if (accumulator.numericSamples.length < NUMERIC_SAMPLE_LIMIT) {
    accumulator.numericSamples.push(numeric);
    return;
  }
  // Reservoir rather than the first N: a file sorted by this column would otherwise report the
  // quantiles of its smallest values as the quantiles of the whole column.
  const slot = randomInt(accumulator.numericCount);
  if (slot < NUMERIC_SAMPLE_LIMIT) accumulator.numericSamples[slot] = numeric;
}

/** The column's frequency table, most frequent first; absent when the distinct values overflowed. */
function formatValueFrequency(accumulator: ColumnAccumulator): LocalDataValueFrequency[] | undefined {
  if (accumulator.valueCountsOverflow || accumulator.valueCounts.size === 0) return undefined;
  const ordered = [...accumulator.valueCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  // A table whose most frequent value appears once carries no frequency information — every value
  // is distinct, so this is an ID or free-text column and the "top values" would just be the first
  // values in the file, printed for nothing.
  if (ordered[0][1] < 2) return undefined;
  return ordered
    .slice(0, VALUE_FREQUENCY_TOP)
    .map(([value, count]) => ({ value, count, ratio: ratio(count, accumulator.nonMissing) }));
}

function formatNumericSummary(accumulator: ColumnAccumulator): LocalDataNumericSummary | undefined {
  if (accumulator.numericCount === 0 || accumulator.numericSamples.length === 0) return undefined;
  const sorted = [...accumulator.numericSamples].sort((left, right) => left - right);
  return {
    count: accumulator.numericCount,
    min: round(accumulator.numericMin),
    max: round(accumulator.numericMax),
    sum: round(accumulator.numericSum),
    mean: round(accumulator.numericSum / accumulator.numericCount),
    p25: round(quantile(sorted, 0.25)),
    median: round(quantile(sorted, 0.5)),
    p75: round(quantile(sorted, 0.75)),
    quantiles_approximate: accumulator.numericCount > accumulator.numericSamples.length,
  };
}

/** Linear-interpolation quantile over sorted values, the reading spreadsheets and pandas agree on. */
function quantile(sorted: number[], fraction: number): number {
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** Trims float noise so a total reads as 45.6 rather than 45.599999999999994. */
function round(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : value;
}

/**
 * Whether a cell reads as a row label rather than a value. CJK labels are matched as a prefix
 * because a real one is often scoped; Latin ones must be the whole cell, or a note beginning
 * `summary of …` would be read as a total row.
 */
function matchesSummaryLabel(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const text = value.trim().replace(/[\s:：、,，.。]+$/u, '');
  if (text.length === 0 || text.length > SUMMARY_LABEL_MAX_LENGTH) return false;
  if (SUMMARY_LABELS_CJK.some((label) => text.startsWith(label))) return true;
  return SUMMARY_LABELS_LATIN.has(text.toLowerCase());
}

/**
 * Settles the retained candidates against the column totals. A summary row holds the total of the
 * column's other rows, and the running total already counts the summary row itself, so the row's own
 * value is exactly half of it.
 */
function confirmSummaryRows(
  candidates: SummaryRowCandidate[],
  columns: Map<string, ColumnAccumulator>,
): LocalDataSummaryRow[] {
  const confirmed: LocalDataSummaryRow[] = [];
  for (const candidate of candidates) {
    const totalColumns: string[] = [];
    for (const [name, value] of candidate.numericCells) {
      const accumulator = columns.get(name);
      // Two equal values would each be "half the total" of the pair, and a zero total is met by
      // every zero: neither is a finding, so a column needs a body of rows behind it first.
      if (!accumulator || accumulator.numericCount < 3 || value === 0) continue;
      const total = accumulator.numericSum;
      if (Math.abs(value * 2 - total) <= Math.max(1e-6, Math.abs(total) * 1e-9)) totalColumns.push(name);
    }
    const signals: LocalDataSummaryRow['signals'] = [];
    if (candidate.labelColumn !== undefined) signals.push('total_label');
    if (totalColumns.length > 0) signals.push('column_total');
    // An empty-key row whose numbers are not a column total is just a sparse row, not a summary.
    if (signals.length === 0) continue;
    confirmed.push({
      row: candidate.row,
      signals,
      ...(candidate.labelColumn !== undefined ? { label_column: candidate.labelColumn } : {}),
      ...(totalColumns.length > 0 ? { total_columns: totalColumns } : {}),
    });
  }
  return confirmed;
}

function summaryRowWarning(rows: LocalDataSummaryRow[], truncated: boolean): string {
  const shown = rows.slice(0, SUMMARY_ROW_WARNING_LIMIT).map((entry) => entry.row);
  const remaining = rows.length - shown.length;
  const labelled = rows.filter((entry) => entry.signals.includes('total_label')).length;
  const totals = rows.filter((entry) => entry.signals.includes('column_total')).length;
  const reasons = [
    labelled > 0 ? `${labelled} carry a total-like label (合计 / 总计 / 小计 / 汇总 / Total / Subtotal)` : undefined,
    totals > 0 ? `${totals} hold a number equal to the total of its column's other rows` : undefined,
  ].filter((reason) => reason !== undefined).join('; ');
  const scope = truncated
    ? ` The scan stopped after ${SUMMARY_ROW_CANDIDATE_LIMIT} candidate rows, so there may be more.`
    : '';
  return `${rows.length} row(s) read as a summary line rather than an observation: ${reasons}. Rows ${shown.join(', ')}${remaining > 0 ? ` and ${remaining} more` : ''} (data-row ordinals, the numbering invalid.rows.jsonl and --salvage-from use; see summary_rows).${scope} Nothing was removed and nothing changed: convert writes these rows as records, and every number reported for their columns counts them, so a real total row makes that column's sum twice its actual total and its max the total. There is no flag that drops a data row; when the user confirms a row is a total, remove it from the source file or re-export without it, then inspect again.`;
}

/**
 * Running state of the duplicate-key scan. Non-repeated keys hold only their first row number, so a
 * file of a million unique keys costs one map entry each rather than a group object each.
 */
interface DuplicateKeyTracker {
  columns: string[];
  firstRow: Map<string, number>;
  groups: Map<string, { count: number; rows: number[]; rowsTruncated: boolean }>;
  checkedRows: number;
  overflow: boolean;
}

/**
 * Picks the columns whose combined value identifies one observation. Explicit fields (the mapping's
 * own) are used as given; otherwise identity and time must both be recognizable by name. Either way
 * a single column is not a key: identity alone calls every second row of a returning user a repeat,
 * and time alone calls every row in the same second one.
 */
function resolveDuplicateKeyColumns(names: string[], explicit?: string[]): string[] | undefined {
  if (explicit && explicit.length > 0) {
    const unique = [...new Set(explicit.filter((name) => name.length > 0))];
    return unique.length > 1 ? unique : undefined;
  }
  const identity = names.find((name) => matchesName(name, ACCOUNT_NAMES))
    ?? names.find((name) => matchesName(name, DISTINCT_NAMES));
  const time = names.find((name) => matchesName(name, TIME_NAMES));
  if (!identity || !time) return undefined;
  const event = names.find((name) => matchesName(name, EVENT_NAMES));
  return event ? [identity, time, event] : [identity, time];
}

function createDuplicateKeyTracker(columns: string[]): DuplicateKeyTracker {
  return { columns, firstRow: new Map(), groups: new Map(), checkedRows: 0, overflow: false };
}

/**
 * Compares one row's key against the rows before it. Values are joined as an array so that
 * `["a","b"]` cannot collide with `["ab",""]`, and compared as written: two spellings of the same
 * instant are two different keys.
 */
function recordDuplicateKey(tracker: DuplicateKeyTracker, row: LocalDataRow, rowNumber: number): void {
  const parts: string[] = [];
  for (const name of tracker.columns) {
    const value = row[name];
    // A row missing part of its key identifies nothing; counting those together would make every
    // blank-key row a duplicate of every other.
    if (isMissing(value)) return;
    parts.push(sampleText(value).trim());
  }
  tracker.checkedRows += 1;
  const hash = createHash('sha256').update(JSON.stringify(parts)).digest('hex');
  const group = tracker.groups.get(hash);
  if (group) {
    group.count += 1;
    if (group.rows.length < DUPLICATE_GROUP_ROW_LIMIT) group.rows.push(rowNumber);
    else group.rowsTruncated = true;
    return;
  }
  const firstRow = tracker.firstRow.get(hash);
  if (firstRow !== undefined) {
    tracker.groups.set(hash, { count: 2, rows: [firstRow, rowNumber], rowsTruncated: false });
    return;
  }
  if (tracker.firstRow.size >= DUPLICATE_KEY_TRACK_LIMIT) {
    tracker.overflow = true;
    return;
  }
  tracker.firstRow.set(hash, rowNumber);
}

function buildDuplicateKeyReport(tracker: DuplicateKeyTracker): LocalDataDuplicateKeyReport | undefined {
  if (tracker.groups.size === 0) return undefined;
  const ordered = [...tracker.groups.entries()]
    .sort(([, left], [, right]) => right.count - left.count || left.rows[0] - right.rows[0]);
  let extraRows = 0;
  for (const [, group] of ordered) extraRows += group.count - 1;
  const groups: LocalDataDuplicateKeyGroup[] = ordered.slice(0, DUPLICATE_GROUP_LIMIT).map(([hash, group]) => ({
    key_hash: hash.slice(0, 16),
    count: group.count,
    rows: group.rows,
    ...(group.rowsTruncated ? { rows_truncated: true } : {}),
  }));
  return {
    key_columns: tracker.columns,
    checked_rows: tracker.checkedRows,
    duplicate_groups: ordered.length,
    extra_rows: extraRows,
    groups,
    ...(ordered.length > DUPLICATE_GROUP_LIMIT ? { groups_truncated: true } : {}),
    ...(tracker.overflow ? { tracking_truncated: true } : {}),
  };
}

function duplicateKeyWarning(report: LocalDataDuplicateKeyReport): string {
  const examples = report.groups
    .slice(0, DUPLICATE_WARNING_GROUP_LIMIT)
    .map((group) => `rows ${group.rows.join(', ')}${group.rows_truncated ? ', …' : ''} (${group.count}×)`)
    .join('; ');
  const remaining = report.duplicate_groups - Math.min(report.groups.length, DUPLICATE_WARNING_GROUP_LIMIT);
  const scope = report.tracking_truncated
    ? ` Tracking stopped after ${DUPLICATE_KEY_TRACK_LIMIT} distinct keys, so there may be more.`
    : '';
  return `${report.duplicate_groups} business key(s) appear on more than one row, ${report.extra_rows} extra row(s) in total, over ${report.checked_rows} row(s) that carried a value in every key column. Key: ${report.key_columns.join(' + ')}. Examples: ${examples}${remaining > 0 ? ` and ${remaining} more group(s)` : ''} (data-row ordinals, the numbering invalid.rows.jsonl and --salvage-from use; see duplicate_keys).${scope} Nothing was removed: repeated rows are sometimes real (one order line per product), and AE appends every accepted event with no way to un-send it, so this has to be settled before upload. Ask the user whether the repeats are separate observations; if they are not, remove them from the source file and inspect again. Values are compared as written, so two spellings of the same instant are two different keys, and a source with a unique key of its own (an order id) is not compared on it unless the mapping names it.`;
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
