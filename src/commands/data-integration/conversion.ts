import { randomInt, randomUUID } from 'node:crypto';
import {
  chmodSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { once } from 'node:events';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { CliValidationError } from '../../core/errors.js';
import { inspectLocalDataInput, selectDataSet, sha256File, streamLocalDataRows, cellIssueCounts, cellIssueWarnings, createXlsxStructureCollector, xlsxStructureReport, xlsxStructureWarnings } from './input.js';
import type { LocalDataInput } from './input.js';
import { isValidAeName } from './mapping.js';
import { applyTypeResolutions, buildPerFileMapping, detectColumnTypeConflicts, validateTypeResolutions } from './multi.js';
import type { MultiFileProfile } from './multi.js';
import { IDENTITY_MAX_LENGTH, isMissing, isUserProfileType, normalizeRecordType, profileLocalData } from './profile.js';
import { parseTimeByAnyFormat, tryStrptime } from './time.js';
import type { WallTimeParts } from './time.js';
import type { LocalDataCellIssue, LocalDataManifest, LocalDataMapping, LocalDataRow, LocalDataSet, TypeResolutions, UeRecordType } from './types.js';
import { isPrivateIp, isValidIp, isValidUuid, stripQuotes } from './field-spec.js';

const SORT_CHUNK_SIZE = 10_000;
const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** A system field whose value violated its spec was dropped from the row (row kept). */
type FieldSkipCode = 'INVALID_IP' | 'INVALID_UUID';

export interface ConvertLocalDataOptions {
  inputFile: string;
  mapping: LocalDataMapping;
  outputDir?: string;
  now?: Date;
  /** Stream every worksheet in file order instead of a single selected sheet. */
  mergeSheets?: boolean;
  /** Re-process only the rows listed in a previous run's invalid.rows.jsonl (row_number set). */
  salvageFrom?: string;
}

export async function convertLocalData(options: ConvertLocalDataOptions): Promise<{
  status: 'ready' | 'blocked';
  output_dir: string;
  manifest: LocalDataManifest;
}> {
  const input = await inspectLocalDataInput(options.inputFile);
  if (input.format !== options.mapping.source.format) {
    throw new CliValidationError('The source file format does not match the mapping.', {
      code: 'LOCAL_DATA_SOURCE_FORMAT_CHANGED',
      location: { field: 'input-file' },
    });
  }
  if (input.sha256 !== options.mapping.source.sha256) {
    throw new CliValidationError('The source file does not match the mapping fingerprint.', {
      code: 'LOCAL_DATA_SOURCE_CHANGED',
      hint: 'Run ae-cli data-integration inspect again and review the new mapping before conversion.',
      location: { field: 'input-file' },
    });
  }
  const dataSet = options.mergeSheets
    ? { id: 'all-sheets', kind: 'sheet' as const, label: 'all-sheets', selector: 'all-sheets' }
    : selectDataSet(input, options.mapping.source.data_set);
  const streamOptions = {
    headerNames: options.mapping.headers,
    skipRows: options.mapping.skip_rows,
    flattenRules: options.mapping.flatten_rules,
    mergeSheets: options.mergeSheets,
    // Both XLSX layout decisions come from the mapping, so the rows converted here are the rows
    // inspect profiled — the mapping is the only place the user's answer to them is recorded.
    fillMergedCells: options.mapping.fill_merged_cells,
    excludeHiddenRows: options.mapping.exclude_hidden_rows,
    // The profile pass inside convert is internal (it writes profile.json); the ragged-row
    // warning is surfaced by the conversion pass below instead, so suppress it here.
    warnRagged: false,
    // The mapping's own columns are the key worth checking for repeats: they are what AE will
    // receive as identity, time, and event name. A file-wide `default_event_name` is the same on
    // every row, so it distinguishes nothing and is left out.
    duplicateKeyFields: [
      options.mapping.account_id_field ?? options.mapping.distinct_id_field,
      options.mapping.time.field,
      options.mapping.event_name_field,
    ].filter((field): field is string => typeof field === 'string' && field.length > 0),
  };
  const salvageSet = options.salvageFrom ? readSalvageRowNumbers(options.salvageFrom) : undefined;
  let salvageMatched = 0;
  const runId = `${formatRunTimestamp(new Date())}-${randomUUID().slice(0, 8)}`;
  const outputDir = resolve(options.outputDir || join('.ae-cli', 'data-integration', 'runs', runId));
  prepareOutputDirectory(outputDir);

  const profile = await profileLocalData(input, dataSet, options.mapping.time.source_timezone, streamOptions);
  const profilePath = join(outputDir, 'profile.json');
  const mappingPath = join(outputDir, 'mapping.json');
  const validPath = join(outputDir, 'valid.ue.jsonl');
  const invalidPath = join(outputDir, 'invalid.rows.jsonl');
  const manifestPath = join(outputDir, 'manifest.json');
  const transformPath = join(outputDir, 'transform.mjs');
  const trackTempPath = join(outputDir, '.track.tmp.jsonl');
  const invalidStream = secureWriteStream(invalidPath);
  const trackStream = secureWriteStream(trackTempPath);
  const userSetBuffer: Array<{ key: string; line: string }> = [];
  const sortChunks: string[] = [];
  let validRecords = 0;
  let invalidRecords = 0;
  const recordTypes: Partial<Record<UeRecordType, number>> = {};
  const skippedFields: Record<string, number> = {};
  let lanIpRecords = 0;
  const flattenMisses: Record<string, number> = {};
  const cellIssues = new Map<LocalDataCellIssue, Map<string, number>>();
  // The converted rows no longer show the source layout, so the manifest is the only record that a
  // merged block or a hidden row was there at all, and what this run did about it.
  const xlsxStructure = input.format === 'xlsx' ? createXlsxStructureCollector() : undefined;

  const rowCount = await streamLocalDataRows(
    input,
    dataSet,
    async (row, rowNumber) => {
      if (salvageSet && !salvageSet.has(rowNumber)) return;
      if (salvageSet) salvageMatched += 1;
      const result = convertRow(row, rowNumber, options.mapping, options.now ?? new Date());
      if (!result.ok) {
        invalidRecords += 1;
        await writeLine(invalidStream, JSON.stringify({ row_number: rowNumber, errors: result.errors, row }));
        return;
      }
      validRecords += 1;
      recordTypes[result.recordType] = (recordTypes[result.recordType] ?? 0) + 1;
      if (result.lanIp) lanIpRecords += 1;
      for (const skip of result.skips) {
        skippedFields[skip.code] = (skippedFields[skip.code] ?? 0) + 1;
      }
      const line = JSON.stringify(result.record);
      if (isUserProfileType(result.recordType)) {
        userSetBuffer.push({ key: result.sortKey, line });
        if (userSetBuffer.length >= SORT_CHUNK_SIZE) flushSortChunk(outputDir, userSetBuffer, sortChunks);
      } else {
        await writeLine(trackStream, line);
      }
    },
    {
      headerNames: streamOptions.headerNames,
      skipRows: streamOptions.skipRows,
      flattenRules: streamOptions.flattenRules,
      flattenMisses,
      cellIssues,
      mergeSheets: streamOptions.mergeSheets,
      fillMergedCells: streamOptions.fillMergedCells,
      excludeHiddenRows: streamOptions.excludeHiddenRows,
      xlsxStructure,
    },
  );
  if (userSetBuffer.length > 0) flushSortChunk(outputDir, userSetBuffer, sortChunks);
  await Promise.all([finishStream(trackStream), finishStream(invalidStream)]);
  for (const [outColumn, count] of Object.entries(flattenMisses)) {
    process.stderr.write(`Warning: flatten rule "${outColumn}" did not materialize for ${count} row(s).\n`);
  }
  // These cells were written as missing, so the record count says nothing about them.
  for (const warning of cellIssueWarnings(cellIssues)) {
    process.stderr.write(`Warning: ${warning}\n`);
  }
  // Same reason: a merged block reads as a sparse column and a hidden row reads as an ordinary one.
  if (xlsxStructure) {
    for (const warning of xlsxStructureWarnings(xlsxStructure, options.mapping.exclude_columns)) {
      process.stderr.write(`Warning: ${warning}\n`);
    }
  }
  const structureReport = xlsxStructure ? xlsxStructureReport(xlsxStructure) : undefined;
  if (salvageSet && salvageMatched === 0) {
    throw new CliValidationError('The salvage file lists no rows from this source.', {
      code: 'LOCAL_DATA_SALVAGE_NO_MATCH',
      hint: 'Pass the invalid.rows.jsonl produced by converting the same source file.',
      location: { field: 'salvage-from' },
    });
  }

  const validStream = secureWriteStream(validPath);
  if (existsSync(trackTempPath)) {
    for await (const chunk of createReadStream(trackTempPath)) {
      await writeRaw(validStream, chunk);
    }
  }
  await mergeSortChunks(sortChunks, validStream);
  await finishStream(validStream);
  if (existsSync(trackTempPath)) unlinkSync(trackTempPath);
  for (const path of sortChunks) if (existsSync(path)) unlinkSync(path);

  writeSecureJson(profilePath, profile);
  writeSecureJson(mappingPath, options.mapping);
  writeSecureText(transformPath, createTransformScript(options.inputFile, mappingPath));
  const validBytes = statSize(validPath);
  // The conservation equation: every streamed data row lands in exactly one bucket, so the source
  // side and the output side must always add up. Keeping both in the manifest is what lets the next
  // reader notice a row dropped or duplicated between the source and the output. A salvage run
  // streams the whole file but only re-processes the listed rows, so its source side is the match
  // count, not the file's row count.
  const sourceRows = salvageSet ? salvageMatched : rowCount;
  const blockedReasons = [
    ...(rowCount === 0 ? ['The source contained no data rows.'] : []),
    ...(rowCount > 0 && validRecords === 0 ? ['No valid UE records were generated.'] : []),
    ...(invalidRecords > 0 ? ['Some source rows failed UE validation.'] : []),
  ];
  const manifest: LocalDataManifest = {
    version: 'ae-local-data-manifest/v1',
    run_id: runId,
    created_at: new Date().toISOString(),
    status: blockedReasons.length > 0 ? 'blocked' : 'ready',
    ...(options.salvageFrom ? { salvage_from: basename(options.salvageFrom) } : {}),
    source: {
      sha256: input.sha256,
      format: input.format,
      data_set: dataSet.id,
      size_bytes: input.sizeBytes,
    },
    output: {
      valid_file: basename(validPath),
      valid_sha256: await sha256File(validPath),
      invalid_file: basename(invalidPath),
      source_rows: sourceRows,
      valid_records: validRecords,
      invalid_records: invalidRecords,
      valid_bytes: validBytes,
      record_types: recordTypes,
      ...(Object.keys(skippedFields).length > 0 ? { skipped_fields: skippedFields } : {}),
      ...(lanIpRecords > 0 ? { lan_ip_records: lanIpRecords } : {}),
      ...(Object.keys(flattenMisses).length > 0 ? { flatten_misses: flattenMisses } : {}),
      ...(cellIssues.size > 0 ? { unreadable_cells: cellIssueCounts(cellIssues) } : {}),
      ...(structureReport ? { xlsx_structure: structureReport } : {}),
      ...(profile.summary_rows ? { summary_rows: profile.summary_rows } : {}),
      ...(profile.duplicate_keys ? { duplicate_keys: profile.duplicate_keys } : {}),
    },
    blocked_reasons: blockedReasons,
  };
  writeSecureJson(`${manifestPath}.tmp`, manifest);
  renameSync(`${manifestPath}.tmp`, manifestPath);
  chmodSync(manifestPath, 0o600);

  return { status: manifest.status, output_dir: outputDir, manifest };
}

export interface ConvertLocalDataMultiOptions {
  inputFiles: string[];
  mapping: LocalDataMapping;
  typeResolutions?: TypeResolutions;
  outputDir?: string;
  now?: Date;
}

export interface ConvertLocalDataMultiResult {
  status: 'ready' | 'blocked';
  output_dir: string;
  files: Array<{
    file: string;
    status: 'ready' | 'blocked';
    output_dir: string;
    manifest: LocalDataManifest;
  }>;
}

/**
 * Convert multiple files against a wildcard (source.sha256 === '*') template mapping,
 * applying per-file type resolutions to conflicting columns. Each file lands in its own
 * `<parent>/<NN>-<basename>/` directory so the single-file manifest↔UE invariants hold.
 */
export async function convertLocalDataMulti(options: ConvertLocalDataMultiOptions): Promise<ConvertLocalDataMultiResult> {
  const sourceTimezone = options.mapping.time.source_timezone;
  const profiled: MultiFileProfile[] = [];
  for (const inputFile of options.inputFiles) {
    const input = await inspectLocalDataInput(inputFile);
    const dataSet = selectDataSet(input);
    const profile = await profileLocalData(input, dataSet, sourceTimezone, {
      collectSamples: true,
      headerNames: options.mapping.headers,
      skipRows: options.mapping.skip_rows,
      flattenRules: options.mapping.flatten_rules,
      warnRagged: false,
    });
    profiled.push({ file: basename(inputFile), profile });
  }

  const conflicts = detectColumnTypeConflicts(profiled);
  const resolutions = options.typeResolutions ?? {};
  if (conflicts.length > 0 && Object.keys(resolutions).length === 0) {
    throw new CliValidationError('Cross-file column type conflicts require explicit resolutions.', {
      code: 'LOCAL_DATA_TYPE_CONFLICTS_UNRESOLVED',
      hint: `Provide --type-resolutions for: ${conflicts.map((conflict) => conflict.column).join(', ')}`,
      location: { field: 'type-resolutions' },
    });
  }
  validateTypeResolutions(resolutions, profiled.map((entry) => entry.file));
  const overrides = applyTypeResolutions(resolutions, profiled);

  const parent = resolve(
    options.outputDir
    || join('.ae-cli', 'data-integration', 'runs', `${formatRunTimestamp(new Date())}-${randomUUID().slice(0, 8)}`),
  );
  prepareOutputDirectory(parent);

  const files: ConvertLocalDataMultiResult['files'] = [];
  let blocked = false;
  for (let index = 0; index < profiled.length; index += 1) {
    const entry = profiled[index];
    const perFileMapping = buildPerFileMapping(options.mapping, entry.profile, overrides.get(entry.file)!);
    const result = await convertLocalData({
      inputFile: options.inputFiles[index],
      mapping: perFileMapping,
      outputDir: join(parent, `${String(index).padStart(2, '0')}-${entry.file}`),
      now: options.now,
    });
    if (result.status === 'blocked') blocked = true;
    files.push({
      file: entry.file,
      status: result.status,
      output_dir: result.output_dir,
      manifest: result.manifest,
    });
  }

  return { status: blocked ? 'blocked' : 'ready', output_dir: parent, files };
}

export function convertRow(
  row: LocalDataRow,
  rowNumber: number,
  mapping: LocalDataMapping,
  now: Date,
): { ok: true; recordType: UeRecordType; record: Record<string, unknown>; sortKey: string; skips: Array<{ code: FieldSkipCode; field: string }>; lanIp: boolean }
  | { ok: false; errors: Array<{ code: string; field?: string }> } {
  const errors: Array<{ code: string; field?: string }> = [];
  const accountId = resolveIdentity(row, mapping.account_id_field, mapping.value_mapping?.account_id, mapping.account_id_value, mapping.random_pool?.account_ids, errors);
  const distinctId = resolveIdentity(row, mapping.distinct_id_field, mapping.value_mapping?.distinct_id, mapping.distinct_id_value, mapping.random_pool?.distinct_ids, errors);
  if (!accountId && !distinctId) errors.push({ code: 'MISSING_USER_ID' });

  let recordType: UeRecordType | undefined;
  if (mapping.mode === 'mixed') {
    const rawType = stripQuotes(row[mapping.record_type_field!]);
    const mappedType = mapping.value_mapping?.record_type && typeof rawType === 'string'
      ? (mapping.value_mapping.record_type[rawType] ?? rawType)
      : rawType;
    recordType = normalizeRecordType(mappedType);
    if (!recordType) errors.push({ code: 'INVALID_RECORD_TYPE', field: mapping.record_type_field });
  } else {
    recordType = mapping.mode;
  }

  // A missing/empty #time may be filled with the current time for user-profile rows only,
  // and only when the mapping explicitly opts in (missing_time: 'now'). Track rows never
  // auto-fill; a missing time stays an INVALID_TIME error.
  const timeValue = row[mapping.time.field];
  let normalizedTime: { instant: Date; formatted: string } | undefined;
  if (isMissing(timeValue)
    && mapping.missing_time === 'now'
    && recordType !== undefined
    && isUserProfileType(recordType)) {
    normalizedTime = { instant: now, formatted: formatInTimeZone(now, mapping.time.source_timezone) };
  } else {
    normalizedTime = normalizeTime(timeValue, mapping.time.source_timezone, mapping.time_format);
    if (!normalizedTime) {
      errors.push({ code: 'INVALID_TIME', field: mapping.time.field });
    } else if (normalizedTime.instant.getTime() < now.getTime() - THREE_YEARS_MS
      || normalizedTime.instant.getTime() > now.getTime() + THREE_DAYS_MS) {
      errors.push({ code: 'TIME_OUT_OF_RANGE', field: mapping.time.field });
    }
  }

  let eventName: string | undefined;
  if (recordType === 'track') {
    const rawEvent = String(stripQuotes(mapping.event_name_field ? row[mapping.event_name_field] ?? '' : mapping.default_event_name ?? ''));
    eventName = mapping.value_mapping?.event_name && mapping.value_mapping.event_name[rawEvent] !== undefined
      ? mapping.value_mapping.event_name[rawEvent]
      : rawEvent;
    if (!isValidAeName(eventName)) {
      errors.push({ code: 'INVALID_EVENT_NAME', field: mapping.event_name_field });
    }
  }

  const skips: Array<{ code: FieldSkipCode; field: string }> = [];
  let lanIp = false;
  // #ip is event-data-only (track); user profile records never carry it.
  let ip: string | undefined;
  if (recordType === 'track') {
    const rawIp = readOptionalField(row, mapping.ip_field);
    if (rawIp) {
      if (isValidIp(rawIp)) {
        ip = rawIp;
        lanIp = isPrivateIp(rawIp);
      } else {
        skips.push({ code: 'INVALID_IP', field: mapping.ip_field! });
      }
    }
  }
  // #uuid applies to both event and user data; a non-UUID value skips only the field.
  let uuid: string | undefined;
  {
    const rawUuid = readOptionalField(row, mapping.uuid_field);
    if (rawUuid) {
      if (isValidUuid(rawUuid)) uuid = rawUuid;
      else skips.push({ code: 'INVALID_UUID', field: mapping.uuid_field! });
    }
  }

  const excluded = new Set(mapping.exclude_columns ?? []);
  const properties: Record<string, unknown> = {};
  for (const property of mapping.properties) {
    // A dotted target is a plan-only sub-property declaration: the parent object/array_row
    // carries the nested value, so a child row never reads or emits data of its own.
    if (property.target.includes('.')) continue;
    if (excluded.has(property.source)) continue;
    let value = stripQuotes(row[property.source]);
    if (isMissing(value)) continue;
    if (property.value_mapping && typeof value === 'string' && property.value_mapping[value] !== undefined) {
      value = property.value_mapping[value];
    }
    const converted = convertProperty(value, property.type, property.transform, mapping.time.source_timezone, property.time_format);
    if (!converted.ok) {
      errors.push({ code: converted.code, field: property.source });
    } else {
      properties[property.target] = converted.value;
    }
  }
  // #zone_offset is event-data-only (track); user profile records never carry it.
  const zoneOffset = recordType === 'track' && mapping.zone_offset_value !== undefined
    ? resolveZoneOffsetValue(mapping.zone_offset_value, now)
    : recordType === 'track' && mapping.zone_offset_field
      ? readZoneOffset(row, mapping.zone_offset_field)
      : undefined;
  if (recordType === 'track' && mapping.zone_offset_field && zoneOffset === undefined) {
    errors.push({ code: 'INVALID_ZONE_OFFSET', field: mapping.zone_offset_field });
  }
  if (errors.length > 0 || !recordType || !normalizedTime) return { ok: false, errors };

  const record: Record<string, unknown> = {
    '#type': recordType,
    '#time': normalizedTime.formatted,
    ...(accountId ? { '#account_id': accountId } : {}),
    ...(distinctId ? { '#distinct_id': distinctId } : {}),
    ...(eventName ? { '#event_name': eventName } : {}),
    ...(ip ? { '#ip': ip } : {}),
    ...(uuid ? { '#uuid': uuid } : {}),
    properties: { ...properties, ...(zoneOffset !== undefined ? { '#zone_offset': zoneOffset } : {}) },
  };
  return {
    ok: true,
    recordType,
    record,
    sortKey: `${accountId ?? distinctId ?? ''}\u0000${normalizedTime.instant.toISOString()}\u0000${String(rowNumber).padStart(12, '0')}`,
    skips,
    lanIp,
  };
}

/** Read an optional system-field source column, returning its trimmed string when present. */
function readOptionalField(row: LocalDataRow, field: string | undefined): string | undefined {
  if (!field) return undefined;
  const value = stripQuotes(row[field]);
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

/**
 * Resolve a zone_offset_value (an integer, or an IANA name) to its integer UTC-hour offset.
 * Whole-hour zones resolve exactly; sub-hour offsets (e.g. +5:30) round to the nearest whole
 * hour per AE's integer contract; DST zones resolve to the offset in effect at `now`.
 */
function resolveZoneOffsetValue(value: number | string, now: Date): number {
  if (typeof value === 'number') return value;
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: value, timeZoneName: 'longOffset' });
  const offsetName = dtf.formatToParts(now).find((part) => part.type === 'timeZoneName')?.value;
  if (!offsetName || offsetName === 'GMT') return 0;
  const match = /^GMT([+-])(\d{1,2}):?(\d{2})?$/.exec(offsetName);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return Math.round(sign * (Number(match[2]) + Number(match[3] ?? 0) / 60));
}

/** Read a zone_offset_field value as an integer UTC-hour offset in [-12,14]. */
function readZoneOffset(row: LocalDataRow, field: string): number | undefined {
  const value = stripQuotes(row[field]);
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const offset = Number(text);
  return Number.isInteger(offset) && offset >= -12 && offset <= 14 ? offset : undefined;
}

/**
 * Parse a previous run's invalid.rows.jsonl into the set of source row numbers to re-process.
 * Each line is `{ row_number, errors, row }`; only the positive-integer `row_number` matters here.
 */
function readSalvageRowNumbers(path: string): Set<number> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new CliValidationError('The salvage file could not be read.', {
      code: 'LOCAL_DATA_SALVAGE_INVALID',
      location: { field: 'salvage-from' },
    });
  }
  const rows = new Set<number>();
  let lineNumber = 0;
  for (const line of text.split('\n')) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    let value: unknown;
    try {
      value = JSON.parse(trimmed);
    } catch {
      throw new CliValidationError('The salvage file contains a line that is not valid JSON.', {
        code: 'LOCAL_DATA_SALVAGE_INVALID',
        location: { field: 'salvage-from', record: lineNumber },
      });
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)
      || !Number.isInteger((value as Record<string, unknown>).row_number)
      || (value as Record<string, unknown>).row_number! <= 0) {
      throw new CliValidationError('The salvage file is not an invalid.rows.jsonl quarantine file.', {
        code: 'LOCAL_DATA_SALVAGE_INVALID',
        location: { field: 'salvage-from', record: lineNumber },
      });
    }
    rows.add((value as Record<string, unknown>).row_number as number);
  }
  if (rows.size === 0) {
    throw new CliValidationError('The salvage file contains no rows.', {
      code: 'LOCAL_DATA_SALVAGE_EMPTY',
      location: { field: 'salvage-from' },
    });
  }
  return rows;
}

function readIdentity(
  row: LocalDataRow,
  field: string | undefined,
  errors: Array<{ code: string; field?: string }>,
): string | undefined {
  if (!field || isMissing(row[field])) return undefined;
  const value = String(stripQuotes(row[field]));
  if (value.length > IDENTITY_MAX_LENGTH) {
    errors.push({ code: 'USER_ID_TOO_LONG', field });
    return undefined;
  }
  return value;
}

function resolveIdentity(
  row: LocalDataRow,
  field: string | undefined,
  valueMapping: Record<string, string> | undefined,
  fixedValue: string | undefined,
  pool: string[] | undefined,
  errors: Array<{ code: string; field?: string }>,
): string | undefined {
  const raw = readIdentity(row, field, errors);
  if (raw !== undefined) return valueMapping?.[raw] ?? raw;
  if (fixedValue) return fixedValue;
  if (pool && pool.length > 0) return pool[randomInt(pool.length)];
  return undefined;
}

function convertProperty(
  value: unknown,
  type: LocalDataMapping['properties'][number]['type'],
  transform?: LocalDataMapping['properties'][number]['transform'],
  timeZone = 'UTC',
  timeFormat?: string,
): { ok: true; value: unknown } | { ok: false; code: 'PROPERTY_TYPE_CONFLICT' | 'PROPERTY_LIMIT_EXCEEDED' } {
  try {
    if (transform === 'stringify') value = typeof value === 'string' ? value : JSON.stringify(value);
    if (transform === 'json' && typeof value === 'string') value = JSON.parse(value);
    if (transform === 'number') value = Number(value);
    if (transform === 'boolean') value = parseBoolean(value);
    if (type === 'string') {
      const text = value instanceof Date ? value.toISOString() : String(value);
      return isPropertyWithinLimits(text, type)
        ? { ok: true, value: text }
        : { ok: false, code: 'PROPERTY_LIMIT_EXCEEDED' };
    }
    if (type === 'number') {
      const number = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(number)) return { ok: false, code: 'PROPERTY_TYPE_CONFLICT' };
      return isPropertyWithinLimits(number, type)
        ? { ok: true, value: number }
        : { ok: false, code: 'PROPERTY_LIMIT_EXCEEDED' };
    }
    if (type === 'boolean') {
      const boolean = typeof value === 'boolean' ? value : parseBoolean(value);
      return typeof boolean === 'boolean' ? { ok: true, value: boolean } : { ok: false, code: 'PROPERTY_TYPE_CONFLICT' };
    }
    if (type === 'datetime') {
      const normalized = normalizeTime(value, timeZone, timeFormat);
      return normalized
        ? { ok: true, value: normalized.formatted }
        : { ok: false, code: 'PROPERTY_TYPE_CONFLICT' };
    }
    if (type === 'list' || type === 'array_row') {
      if (!Array.isArray(value)) return { ok: false, code: 'PROPERTY_TYPE_CONFLICT' };
      return isPropertyWithinLimits(value, type)
        ? { ok: true, value }
        : { ok: false, code: 'PROPERTY_LIMIT_EXCEEDED' };
    }
    if (type === 'object') {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, code: 'PROPERTY_TYPE_CONFLICT' };
      }
      return isPropertyWithinLimits(value, type)
        ? { ok: true, value }
        : { ok: false, code: 'PROPERTY_LIMIT_EXCEEDED' };
    }
  } catch {
    return { ok: false, code: 'PROPERTY_TYPE_CONFLICT' };
  }
  return { ok: false, code: 'PROPERTY_TYPE_CONFLICT' };
}

function isPropertyWithinLimits(
  value: unknown,
  expectedType: LocalDataMapping['properties'][number]['type'],
): boolean {
  if (expectedType === 'string') return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 2 * 1024;
  if (expectedType === 'number') return typeof value === 'number'
    && Number.isFinite(value)
    && value >= -9e15
    && value <= 9e15;
  if (expectedType === 'boolean') return typeof value === 'boolean';
  if (expectedType === 'datetime') return typeof value === 'string';
  if (expectedType === 'object') return isValidObjectProperty(value);
  if (!Array.isArray(value) || value.length > 500) return false;
  if (value.every((item) => typeof item === 'string')) {
    return value.every((item) => Buffer.byteLength(item as string, 'utf8') <= 255);
  }
  if (value.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))) {
    return value.every(isValidObjectProperty);
  }
  return false;
}

function isValidObjectProperty(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 100) return false;
  return entries.every(([name, nested]) => isValidAeName(name) && isValidNestedProperty(nested));
}

function isValidNestedProperty(value: unknown): boolean {
  // A null/undefined nested value is "missing", not a limit violation; treat it as valid so a
  // single empty field inside an object/list does not quarantine the whole row.
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8') <= 2 * 1024;
  if (typeof value === 'number') return Number.isFinite(value) && value >= -9e15 && value <= 9e15;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) {
    if (value.length > 500) return false;
    if (value.every((item) => typeof item === 'string')) {
      return value.every((item) => Buffer.byteLength(item as string, 'utf8') <= 255);
    }
    return value.every(isValidObjectProperty);
  }
  return isValidObjectProperty(value);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim();
  const lowered = normalized.toLowerCase();
  // 是/否 are real business-data values and are preserved verbatim.
  if (['true', '1', 'yes', 'y', '是'].includes(lowered)) return true;
  if (['false', '0', 'no', 'n', '否'].includes(lowered)) return false;
  return undefined;
}

function normalizeTime(
  value: unknown,
  timeZone: string,
  timeFormat?: string,
): { instant: Date; formatted: string } | undefined {
  let instant: Date;
  if (value instanceof Date) {
    instant = value;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1 && value <= 2_958_465) {
      const excelWallTime = new Date(Date.UTC(1899, 11, 30) + value * 24 * 60 * 60 * 1000);
      instant = zonedWallTimeToDate({
        year: excelWallTime.getUTCFullYear(),
        month: excelWallTime.getUTCMonth() + 1,
        day: excelWallTime.getUTCDate(),
        hour: excelWallTime.getUTCHours(),
        minute: excelWallTime.getUTCMinutes(),
        second: excelWallTime.getUTCSeconds(),
        millisecond: excelWallTime.getUTCMilliseconds(),
      }, timeZone);
    } else {
      const millis = value > 1e12 ? value : value > 1e9 ? value * 1000 : Number.NaN;
      instant = new Date(millis);
    }
  } else if (typeof value === 'string') {
    const text = stripQuotes(value) as string;
    if (/^\d{10}(?:\d{3})?$/.test(text)) {
      const numeric = Number(text);
      instant = new Date(text.length === 10 ? numeric * 1000 : numeric);
      if (!Number.isFinite(instant.getTime())) return undefined;
      return { instant, formatted: formatInTimeZone(instant, timeZone) };
    }
    // Values with an explicit offset are authoritative instants: route them to `new Date`
    // instead of wall-clock format parsing, which would silently discard the offset.
    if (hasExplicitOffset(text)) {
      instant = new Date(text.replace(/\s/, 'T'));
      if (!Number.isFinite(instant.getTime())) return undefined;
      return { instant, formatted: formatInTimeZone(instant, timeZone) };
    }
    if (timeFormat) {
      const parts = tryStrptime(text, timeFormat);
      if (!parts) return undefined;
      instant = zonedWallTimeToDate(parts, timeZone);
    } else {
      const dashed = text.replace(/\//g, '-');
      const naive = dashed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/);
      if (naive) {
        const parts = {
          year: Number(naive[1]), month: Number(naive[2]), day: Number(naive[3]),
          hour: Number(naive[4] ?? 0), minute: Number(naive[5] ?? 0), second: Number(naive[6] ?? 0),
          millisecond: Number((naive[7] ?? '0').padEnd(3, '0')),
        };
        if (!isValidCalendarParts(parts)) return undefined;
        instant = zonedWallTimeToDate(parts, timeZone);
      } else {
        const wallParts = parseTimeByAnyFormat(text);
        if (wallParts) {
          instant = zonedWallTimeToDate(wallParts, timeZone);
        } else {
          instant = new Date(text);
        }
      }
    }
  } else {
    return undefined;
  }
  if (!Number.isFinite(instant.getTime())) return undefined;
  return { instant, formatted: formatInTimeZone(instant, timeZone) };
}

function hasExplicitOffset(text: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);
}

function zonedWallTimeToDate(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number; millisecond: number },
  timeZone: string,
): Date {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
  let guess = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = datePartsInZone(new Date(guess), timeZone);
    const represented = Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute, current.second, parts.millisecond);
    guess += desired - represented;
  }
  return new Date(guess);
}

function formatInTimeZone(value: Date, timeZone: string): string {
  const parts = datePartsInZone(value, timeZone);
  const pad = (number: number, length = 2) => String(number).padStart(length, '0');
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}.${pad(value.getUTCMilliseconds(), 3)}`;
}

function datePartsInZone(value: Date, timeZone: string): Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute'), second: read('second') };
}

function isValidCalendarParts(parts: {
  year: number; month: number; day: number; hour: number; minute: number; second: number; millisecond: number;
}): boolean {
  if (parts.hour < 0 || parts.hour > 23 || parts.minute < 0 || parts.minute > 59
    || parts.second < 0 || parts.second > 59 || parts.millisecond < 0 || parts.millisecond > 999) return false;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return date.getUTCFullYear() === parts.year
    && date.getUTCMonth() === parts.month - 1
    && date.getUTCDate() === parts.day;
}

function flushSortChunk(
  outputDir: string,
  buffer: Array<{ key: string; line: string }>,
  chunks: string[],
): void {
  buffer.sort((left, right) => left.key.localeCompare(right.key));
  const path = join(outputDir, `.user-set-${chunks.length}.tmp.jsonl`);
  writeSecureText(path, `${buffer.map((item) => JSON.stringify(item)).join('\n')}\n`);
  chunks.push(path);
  buffer.length = 0;
}

async function mergeSortChunks(paths: string[], output: SecureWritable): Promise<void> {
  const cursors = await Promise.all(paths.map(async (path) => {
    const iterator = createInterface({ input: createReadStream(path), crlfDelay: Infinity })[Symbol.asyncIterator]();
    return { iterator, current: await readSortItem(iterator) };
  }));
  while (true) {
    let selected = -1;
    for (let index = 0; index < cursors.length; index += 1) {
      if (!cursors[index].current) continue;
      if (selected < 0 || cursors[index].current!.key < cursors[selected].current!.key) selected = index;
    }
    if (selected < 0) break;
    await writeLine(output, cursors[selected].current!.line);
    cursors[selected].current = await readSortItem(cursors[selected].iterator);
  }
}

async function readSortItem(iterator: AsyncIterator<string>): Promise<{ key: string; line: string } | undefined> {
  const next = await iterator.next();
  if (next.done) return undefined;
  return JSON.parse(next.value) as { key: string; line: string };
}

function prepareOutputDirectory(path: string): void {
  if (existsSync(path) && readdirSync(path).length > 0) {
    throw new CliValidationError('The output directory must be new or empty.', {
      code: 'LOCAL_DATA_OUTPUT_NOT_EMPTY',
      location: { field: 'output-dir' },
    });
  }
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

/** A write stream plus a promise that rejects on its first error, so a disk-full (ENOSPC) or
 * permission failure surfaces as a thrown error instead of hanging `once(stream, 'finish')`. */
interface SecureWritable {
  stream: ReturnType<typeof createWriteStream>;
  path: string;
  errorPromise: Promise<never>;
}

function secureWriteStream(path: string): SecureWritable {
  const stream = createWriteStream(path, { encoding: 'utf8', mode: 0o600, flags: 'wx' });
  let fail: ((error: Error) => void) | undefined;
  const errorPromise = new Promise<never>((_, reject) => { fail = reject; });
  // Prevent an unhandled rejection if the stream errors before a write/finish awaits it.
  errorPromise.catch(() => {});
  stream.on('error', (error) => fail?.(error));
  return { stream, path, errorPromise };
}

function writeFailure(path: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to write "${path}": ${detail}. Check available disk space and directory permissions.`, { cause: error });
}

async function writeRaw(target: SecureWritable, data: string | Buffer): Promise<void> {
  try {
    if (!target.stream.write(data)) {
      await Promise.race([once(target.stream, 'drain'), target.errorPromise]);
    }
  } catch (error) {
    throw writeFailure(target.path, error);
  }
}

async function writeLine(target: SecureWritable, line: string): Promise<void> {
  await writeRaw(target, `${line}\n`);
}

async function finishStream(target: SecureWritable): Promise<void> {
  try {
    target.stream.end();
    await Promise.race([once(target.stream, 'finish'), target.errorPromise]);
  } catch (error) {
    throw writeFailure(target.path, error);
  }
}

function writeSecureJson(path: string, value: unknown): void {
  writeSecureText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeSecureText(path: string, value: string): void {
  writeFileSync(path, value, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  chmodSync(path, 0o600);
}

function createTransformScript(inputFile: string, mappingPath: string): string {
  return [
    "import { spawnSync } from 'node:child_process';",
    "const outputDir = process.argv[2];",
    "if (!outputDir) { console.error('Usage: node transform.mjs <new-output-directory>'); process.exit(2); }",
    `const result = spawnSync('ae-cli', ['data-integration', 'convert', '--input-file', ${JSON.stringify(resolve(inputFile))}, '--mapping', ${JSON.stringify(mappingPath)}, '--output-dir', outputDir], { stdio: 'inherit' });`,
    "process.exit(result.status ?? 1);",
    '',
  ].join('\n');
}

function statSize(path: string): number {
  return statSync(path).size;
}

function formatRunTimestamp(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
