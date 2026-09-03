import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { extname, basename } from 'node:path';
import { createInterface } from 'node:readline';
import { StringDecoder } from 'node:string_decoder';
import { pipeline } from 'node:stream/promises';
import ExcelJS from 'exceljs';
import ExcelWorksheetReader from 'exceljs/lib/stream/xlsx/worksheet-reader.js';
import ExcelStylesXform from 'exceljs/lib/xlsx/xform/style/styles-xform.js';
import XLSXMod from 'xlsx';
import { parse as parseCsv } from 'csv-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';
import createJsonParser from 'stream-json';
import Pick from 'stream-json/filters/Pick.js';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import StreamValues from 'stream-json/streamers/StreamValues.js';
import * as unzipper from 'unzipper';
import { SaxesParser } from 'saxes';
import { CliValidationError } from '../../core/errors.js';
import { detectEncoding, decodeTextStream, decodeFileSample } from './encoding.js';
import { flattenDelimitedRow, flattenLocalDataRow } from './flatten.js';
import { assessFileSize } from './estimate.js';
import type {
  HeaderDetection,
  LocalDataCellIssue,
  LocalDataFormat,
  LocalDataRow,
  LocalDataSet,
  LocalDataXlsxStructure,
} from './types.js';

const XLSX = (XLSXMod as any).default ?? XLSXMod;

export interface LocalDataInput {
  filePath: string;
  format: LocalDataFormat;
  sizeBytes: number;
  sha256: string;
  dataSets: LocalDataSet[];
  /**
   * Data sets present in the file but kept out of `dataSets`: XLSX worksheets hidden in the
   * workbook. They are reported so a smaller row count is explainable, and can still be read by
   * naming one in `--data-set`.
   */
  excludedDataSets?: LocalDataSet[];
  /** Delimiter for sniffed `.txt` content (`,` or `\t`); undefined for known extensions. */
  delimiter?: string;
  /** Detected text encoding for text formats; undefined for binary XLS/XLSX. */
  encoding?: string;
}

export interface LocalDataInputMeta {
  filePath: string;
  format: LocalDataFormat;
  sizeBytes: number;
  /** Delimiter for sniffed `.txt` content (`,` or `\t`); undefined for known extensions. */
  delimiter?: string;
  /** Detected text encoding for text formats; undefined for binary XLS/XLSX. */
  encoding?: string;
}

/**
 * Resolve cheap input metadata (path, format, size, delimiter, encoding) without hashing
 * or reading beyond the sniff/encoding samples. Shared by the full input inspection and
 * `--dry-run` size estimates.
 */
export function resolveLocalDataInputMeta(filePath: string): LocalDataInputMeta {
  let format = resolveFormat(filePath);
  let delimiter: string | undefined;
  let encoding: string | undefined;

  // Unknown/txt extensions fall back to content sniffing (CSV/TSV/NDJSON).
  if (format === 'txt') {
    encoding = detectEncoding(filePath);
    const sniffed = sniffFormat(filePath, encoding);
    format = sniffed.format;
    delimiter = sniffed.delimiter;
  }

  let sizeBytes: number;
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    sizeBytes = stat.size;
  } catch {
    throw new CliValidationError('The local data input must be a readable file.', {
      code: 'LOCAL_DATA_INPUT_NOT_FOUND',
      location: { field: 'input-file' },
    });
  }
  if (format !== 'xls' && format !== 'xlsx' && !encoding) {
    encoding = detectEncoding(filePath);
  }

  return {
    filePath,
    format,
    sizeBytes,
    ...(delimiter ? { delimiter } : {}),
    ...(encoding ? { encoding } : {}),
  };
}

export async function inspectLocalDataInput(filePath: string): Promise<LocalDataInput> {
  const meta = resolveLocalDataInputMeta(filePath);
  emitSizeWarning(meta.filePath, meta.format, meta.sizeBytes, meta.encoding);

  try {
    const discovered = await discoverDataSets(filePath, meta.format);
    return {
      ...meta,
      sha256: await sha256File(filePath),
      dataSets: discovered.visible,
      ...(discovered.hidden.length > 0 ? { excludedDataSets: discovered.hidden } : {}),
    };
  } catch (error) {
    if (error instanceof CliValidationError) throw error;
    throw localDataParseError(meta.format);
  }
}

/**
 * Size gate: large XLS workbooks keep a hard ceiling (whole-workbook parse can OOM),
 * while other formats are only warned when a single command would run for a long time.
 * Warnings go to stderr and never block; the XLS ceiling is the only rejection.
 */
function emitSizeWarning(filePath: string, format: LocalDataFormat, sizeBytes: number, encoding?: string): void {
  const assessment = assessFileSize(basename(filePath), format, sizeBytes, encoding);
  if (assessment.rejected) {
    throw new CliValidationError('XLS input exceeds the supported file size limit.', {
      code: 'LOCAL_DATA_FILE_TOO_LARGE',
      hint: 'XLS files larger than 1 GB are not supported; convert the workbook to XLSX or split it first.',
      location: { field: 'input-file' },
    });
  }
  if (assessment.warning) {
    process.stderr.write(`${assessment.warning}\n`);
  }
}

export function selectDataSet(input: LocalDataInput, requested?: string): LocalDataSet {
  if (requested) {
    const matches = (candidate: LocalDataSet) =>
      candidate.id === requested || candidate.selector === requested || candidate.label === requested;
    const selected = input.dataSets.find(matches);
    if (selected) return selected;
    // Naming a hidden worksheet is an explicit decision, so honor it rather than pretending the
    // sheet does not exist — but say out loud that it is hidden, since the file does not show it.
    const excluded = input.excludedDataSets?.find(matches);
    if (excluded) {
      process.stderr.write(`Warning: "${excluded.label}" is hidden in the source workbook and was selected explicitly.\n`);
      return excluded;
    }
    throw new CliValidationError('The requested Sheet or JSON Path was not found.', {
      code: 'LOCAL_DATA_SET_NOT_FOUND',
      hint: `Choose one of: ${input.dataSets.map((item) => item.id).join(', ')}`,
      location: { field: 'data-set' },
    });
  }
  const hidden = input.excludedDataSets ?? [];
  if (input.dataSets.length === 0 && hidden.length > 0) {
    // Reporting "multiple data sets" with an empty candidate list would read as a parse failure.
    // Say what is actually true: everything this file offers is hidden, so reading any of it is a
    // decision the user has to make.
    throw new CliValidationError('Every data set in this file is hidden in the source.', {
      code: 'LOCAL_DATA_ALL_DATA_SETS_HIDDEN',
      hint: `Confirm with the user, then pass --data-set with one of: ${hidden.map((item) => item.id).join(', ')}`,
      location: { field: 'data-set' },
    });
  }
  if (input.dataSets.length !== 1) {
    throw new CliValidationError('This file contains multiple data sets.', {
      code: 'LOCAL_DATA_SET_REQUIRED',
      hint: `Pass --data-set with one of: ${input.dataSets.map((item) => item.id).join(', ')}`,
      location: { field: 'data-set' },
    });
  }
  return input.dataSets[0];
}

export interface StreamLocalDataOptions {
  /** Delimiter override (sniffed `.txt` files); defaults to the input's delimiter. */
  delimiter?: string;
  /** Text encoding override; defaults to the input's detected encoding. */
  encoding?: string;
  /** Fixed column names: the first row is data, not a header. */
  headerNames?: string[];
  /** Headerless delimited/Excel input: auto-generate col_1..col_N from the first row. */
  noHeader?: boolean;
  /** Nested flatten rules: { outColumn: 'dot.path' }. JSON/NDJSON paths are row-relative; CSV/TSV/Excel paths are <column>.<cell-relative path>. */
  flattenRules?: Record<string, string>;
  /** Collector for flatten rules that did not materialize for a row (keyed by out-column). */
  flattenMisses?: Record<string, number>;
  /** Stream every worksheet in file order instead of a single selected sheet. */
  mergeSheets?: boolean;
  /**
   * Collector for columns whose XLSX cells carry a date number format. Their values are read as
   * wall-clock timestamps rather than Excel serial numbers, which changes the inferred type, so
   * inspect names them to the user.
   */
  excelDateColumns?: Set<string>;
  /**
   * Collector for XLSX cells that hold no usable value, as `issue -> column -> count`. The cells
   * read as missing, so without this the row count stays the same and nothing says why a column
   * is empty.
   */
  cellIssues?: Map<LocalDataCellIssue, Map<string, number>>;
  /** Emit the ragged-row stderr warning (default true). Internal passes suppress it. */
  warnRagged?: boolean;
  /**
   * Discard the first N rows of the source before the header row is interpreted, for files whose
   * export puts a title or banner above the real header. Counted as the reader sees rows, so the
   * ordinals inspect reports translate directly into this value. Delimited and Excel only.
   */
  skipRows?: number;
  /**
   * Collector for the XLSX structure facts a streamed row cannot carry — merged blocks and hidden
   * rows/columns. Report-only: it changes nothing about which rows or values are read.
   */
  xlsxStructure?: XlsxStructureCollector;
  /**
   * Copy each merged block's value into the cells its range covers, bounded to that range (XLSX
   * only). Off by default: the cells are empty in the file, and filling them changes the data.
   */
  fillMergedCells?: boolean;
  /**
   * Leave rows hidden in the source worksheet out of the stream (XLSX only). Off by default: a
   * hidden row may be a filtered view rather than deleted data, so dropping rows is the user's call.
   */
  excludeHiddenRows?: boolean;
}

/**
 * Marker for an error thrown by the per-row callback (a program error such as a disk-full
 * during output), as opposed to a parse error from the source stream. `streamLocalDataRows`
 * re-throws these untouched so a write failure or mapping bug is never misreported as a
 * malformed input file.
 */
class LocalDataRowCallbackError extends Error {
  constructor(readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'LocalDataRowCallbackError';
  }
}

/** Wrap the row callback so its failures are distinguishable from source parse failures. */
function wrapRowCallback(
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
): (row: LocalDataRow, rowNumber: number) => void | Promise<void> {
  return async (row, rowNumber) => {
    try {
      await onRow(row, rowNumber);
    } catch (error) {
      if (error instanceof CliValidationError) throw error;
      throw new LocalDataRowCallbackError(error);
    }
  };
}

export async function streamLocalDataRows(
  input: LocalDataInput,
  dataSet: LocalDataSet,
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
  options: StreamLocalDataOptions = {},
): Promise<number> {
  const opts: StreamLocalDataOptions = {
    delimiter: options.delimiter ?? input.delimiter ?? (input.format === 'tsv' ? '\t' : ','),
    encoding: options.encoding ?? input.encoding ?? 'utf-8',
    headerNames: options.headerNames,
    noHeader: options.noHeader,
    flattenRules: options.flattenRules,
    flattenMisses: options.flattenMisses,
    mergeSheets: options.mergeSheets,
    excelDateColumns: options.excelDateColumns,
    cellIssues: options.cellIssues,
    warnRagged: options.warnRagged,
    skipRows: options.skipRows,
    xlsxStructure: options.xlsxStructure,
    fillMergedCells: options.fillMergedCells,
    excludeHiddenRows: options.excludeHiddenRows,
  };
  const wrappedRow = wrapRowCallback(onRow);
  try {
    switch (input.format) {
      case 'csv':
      case 'tsv':
        return await streamDelimited(input.filePath, wrappedRow, opts);
      case 'jsonl':
        return await streamJsonLines(input.filePath, wrappedRow, opts);
      case 'json':
        return await streamJson(input.filePath, dataSet.selector ?? '$', wrappedRow, opts);
      case 'xlsx':
        return await streamXlsx(input.filePath, dataSet.label, wrappedRow, opts);
      case 'xls':
        return await streamXls(input.filePath, dataSet.label, wrappedRow, opts);
    }
  } catch (error) {
    if (error instanceof CliValidationError) throw error;
    if (error instanceof LocalDataRowCallbackError) {
      throw error.cause instanceof Error ? error.cause : error;
    }
    throw localDataParseError(input.format);
  }
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

function resolveFormat(filePath: string): LocalDataFormat | 'txt' {
  const extension = extname(filePath).slice(1).toLowerCase();
  if (extension === 'csv') return 'csv';
  if (extension === 'tsv' || extension === 'tab') return 'tsv';
  if (extension === 'json' || extension === 'jsonl') return extension;
  if (extension === 'ndjson') return 'jsonl';
  if (extension === 'xls') return 'xls';
  if (extension === 'xlsx' || extension === 'xlsm') return 'xlsx';
  // .txt and unknown extensions fall back to content sniffing.
  return 'txt';
}

export interface SniffedDelimitedFormat {
  format: 'csv' | 'tsv' | 'jsonl';
  delimiter?: string;
}

/** Sniff the delimiter of a delimited text file (`,\\t`; bounded sample). */
export function sniffDelimiter(filePath: string, encoding?: string): string {
  const content = decodeFileSample(filePath, encoding ?? detectEncoding(filePath));
  const lines = content.split(/\r?\n/).filter((line) => line.trim()).slice(0, 10);
  if (lines.length === 0) return ',';

  let best = { delimiter: ',', score: Number.NEGATIVE_INFINITY };
  for (const char of [',', '\t']) {
    const regex = new RegExp(escapeRegex(char), 'g');
    const counts = lines.map((line) => {
      const stripped = line.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
      return (stripped.match(regex) || []).length;
    });
    const nonZero = counts.filter((count) => count > 0);
    // Require at least half the sampled lines to contain the delimiter.
    if (nonZero.length < lines.length * 0.5) continue;
    const average = nonZero.reduce((sum, count) => sum + count, 0) / nonZero.length;
    if (average < 1) continue;
    const variance = nonZero.reduce((sum, count) => sum + (count - average) ** 2, 0) / nonZero.length;
    const score = nonZero.length - variance;
    if (score > best.score) best = { delimiter: char, score };
  }
  return best.delimiter;
}

/** Sniff `.txt` content as NDJSON, TSV, or CSV (bounded sample). */
export function sniffFormat(filePath: string, encoding?: string): SniffedDelimitedFormat {
  const content = decodeFileSample(filePath, encoding ?? detectEncoding(filePath));
  const lines = content.split(/\r?\n/).filter((line) => line.trim()).slice(0, 10);

  if (lines.length > 0) {
    let jsonCount = 0;
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) jsonCount += 1;
      } catch { /* not JSON */ }
    }
    if (jsonCount >= lines.length * 0.8 && jsonCount > 0) return { format: 'jsonl' };
  }

  const delimiter = sniffDelimiter(filePath, encoding);
  return { format: delimiter === '\t' ? 'tsv' : 'csv', delimiter };
}

/**
 * Detect whether the first row of a delimited file is a header row. Operates on
 * raw records (before header interpretation) so the first row is not pre-stripped.
 */
export function detectHeaderRow(rows: string[][], numSample = 10): HeaderDetection {
  if (rows.length === 0) return { hasHeaders: true, confidence: 'high', reason: 'empty file' };
  if (rows.length === 1) {
    return { hasHeaders: true, confidence: 'low', reason: 'only one row; treating it as a header by default' };
  }

  const first = rows[0].map((value) => String(value).trim());
  const columnCount = first.length;
  if (columnCount === 0) return { hasHeaders: true, confidence: 'high', reason: 'no column data' };

  const firstNumeric = first.filter(isNumeric).length;
  const firstRatio = firstNumeric / columnCount;
  const sample = rows.slice(1, numSample + 1);

  // All first-row values unique and non-numeric → headers. Uniqueness alone is not
  // enough (IDs/timestamps are unique too), but numeric values mark a row as data.
  if (new Set(first).size === first.length && firstNumeric === 0) {
    return { hasHeaders: true, confidence: 'high', reason: 'all first-row values are unique and non-numeric, appears to be headers' };
  }

  const dataRatios: number[] = [];
  for (const row of sample) {
    const values = row.map((value) => String(value).trim());
    if (values.length !== columnCount) continue;
    dataRatios.push(values.filter(isNumeric).length / columnCount);
  }
  if (dataRatios.length === 0) {
    return { hasHeaders: true, confidence: 'low', reason: 'cannot sample enough data rows; treating the first row as a header by default' };
  }
  const averageRatio = dataRatios.reduce((sum, ratio) => sum + ratio, 0) / dataRatios.length;

  if (Math.abs(firstRatio - averageRatio) > 0.5) {
    return {
      hasHeaders: true, confidence: 'medium',
      reason: `first row pattern differs significantly from data rows (numeric ratio ${Math.round(firstRatio * 100)}% vs ${Math.round(averageRatio * 100)}%), appears to be headers`,
    };
  }
  return {
    hasHeaders: false, confidence: 'medium',
    reason: `first row pattern matches data rows (numeric ratio ${Math.round(firstRatio * 100)}% vs ${Math.round(averageRatio * 100)}%), appears to lack headers`,
  };
}

/** Peek up to `limit` raw records from a delimited file (used for header detection). */
export function peekDelimitedRecords(
  filePath: string,
  options: { delimiter?: string; encoding?: string; limit?: number } = {},
): string[][] {
  const delimiter = options.delimiter ?? ',';
  const encoding = options.encoding ?? detectEncoding(filePath);
  const content = decodeFileSample(filePath, encoding, 256 * 1024);
  const records = parseCsvSync(content, {
    delimiter,
    quote: delimiter === '\t' ? null : '"',
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];
  return records.slice(0, options.limit ?? 10);
}

/** How many leading rows may be a title/banner before the real header row. */
const TITLE_ROW_SCAN_LIMIT = 3;
/** A row must be at least this wide to be credible as the real header row below a title. */
const TITLE_ROW_MIN_HEADER_WIDTH = 3;

/**
 * Detect leading title/banner rows above the real header row — an exported report whose first row
 * holds only a caption ("2026年3月销售明细") makes that caption the header and demotes the real
 * header to data. Reports ordinals and non-empty cell counts only, never cell text, and only when a
 * plausible header row follows: a lone value in row 1 of a two-column file is too ambiguous to call.
 */
export function detectLeadingTitleRows(rows: unknown[][]): Array<{ row: number; non_empty_cells: number }> {
  const width = (row: unknown[]) => row.filter((value) => !isMissing(value)).length;
  const titles: Array<{ row: number; non_empty_cells: number }> = [];
  for (let index = 0; index < Math.min(rows.length, TITLE_ROW_SCAN_LIMIT); index += 1) {
    const cells = width(rows[index]);
    if (cells > 1) break;
    titles.push({ row: index + 1, non_empty_cells: cells });
  }
  if (titles.length === 0) return [];
  const next = rows[titles.length];
  if (!next || width(next) < TITLE_ROW_MIN_HEADER_WIDTH) return [];
  return titles;
}

function escapeRegex(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNumeric(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !Number.isNaN(Number(trimmed));
}

/**
 * Data sets a file offers, split by whether they are hidden in the source. A hidden worksheet is
 * usually scratch space, a lookup table, or a superseded draft, so it stays out of the automatic
 * candidates and out of `--merge-sheets`; it remains reachable through an explicit `--data-set`.
 */
interface DiscoveredDataSets {
  visible: LocalDataSet[];
  hidden: LocalDataSet[];
}

async function discoverDataSets(filePath: string, format: LocalDataFormat): Promise<DiscoveredDataSets> {
  if (format === 'csv' || format === 'tsv' || format === 'jsonl') {
    return { visible: [{ id: '$', kind: 'file', label: basename(filePath), selector: '$' }], hidden: [] };
  }
  if (format === 'xls') {
    const workbook = XLSX.readFile(filePath, { dense: true });
    return {
      visible: workbook.SheetNames.map((name: string) => ({ id: `sheet:${name}`, kind: 'sheet', label: name, selector: name })),
      hidden: [],
    };
  }
  if (format === 'xlsx') {
    const sheets = await readXlsxSheetDefinitions(filePath);
    const toDataSet = (sheet: XlsxSheetDefinition): LocalDataSet => ({
      id: `sheet:${sheet.name}`,
      kind: 'sheet',
      label: sheet.name,
      selector: sheet.name,
    });
    return {
      visible: sheets.filter((sheet) => !sheet.hidden).map(toDataSet),
      hidden: sheets.filter((sheet) => sheet.hidden).map(toDataSet),
    };
  }
  return { visible: await discoverJsonDataSets(filePath), hidden: [] };
}

async function discoverJsonDataSets(filePath: string): Promise<LocalDataSet[]> {
  const encoding = detectEncoding(filePath);
  const first = await firstNonWhitespaceCharacter(filePath, encoding);
  if (first === '[') return [{ id: '$', kind: 'json-path', label: '$', selector: '$' }];
  if (first !== '{') {
    throw new CliValidationError('JSON input must contain an object or array.', {
      code: 'LOCAL_DATA_JSON_ROOT_INVALID',
      location: { field: 'input-file' },
    });
  }

  const candidates = new Map<string, LocalDataSet>();
  const stack: Array<{ type: 'object' | 'array'; path: string[]; pendingKey?: string }> = [];
  const tokenParser = createJsonParser();
  tokenParser.on('data', (token: { name: string; value?: unknown }) => {
    const parent = stack.at(-1);
    if (token.name === 'keyValue' && parent?.type === 'object') {
      parent.pendingKey = String(token.value ?? '');
    } else if (token.name === 'startObject') {
      stack.push({ type: 'object', path: childPath(parent) });
    } else if (token.name === 'endObject') {
      stack.pop();
    } else if (token.name === 'startArray') {
      const path = childPath(parent);
      if (path.length > 0) {
        const selector = path.join('.');
        const label = `$.${selector}`;
        candidates.set(selector, { id: `json-path:${label}`, kind: 'json-path', label, selector });
      }
      stack.push({ type: 'array', path });
    } else if (token.name === 'endArray') {
      stack.pop();
    }
  });
  await pipeline(decodeTextStream(filePath, encoding), tokenParser);
  return candidates.size > 0
    ? [...candidates.values()]
    : [{ id: '$', kind: 'json-path', label: '$', selector: '$object' }];
}

function childPath(parent: { type: 'object' | 'array'; path: string[]; pendingKey?: string } | undefined): string[] {
  if (!parent) return [];
  if (parent.type === 'object' && parent.pendingKey) return [...parent.path, parent.pendingKey];
  return [...parent.path];
}

async function streamDelimited(
  filePath: string,
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
  options: StreamLocalDataOptions,
): Promise<number> {
  const delimiter = options.delimiter ?? ',';
  const encoding = options.encoding ?? 'utf-8';
  const skipRows = Math.max(0, options.skipRows ?? 0);
  let headerNames = options.headerNames;
  if (!headerNames && options.noHeader) {
    const peeked = peekDelimitedRecords(filePath, { delimiter, encoding, limit: skipRows + 1 });
    const firstRecord = peeked[skipRows] ?? [];
    headerNames = firstRecord.map((_, index) => `col_${index + 1}`);
  }

  // Array records let us detect width mismatches (extra fields dropped, missing fields null)
  // instead of silently relaxing the column count behind csv-parse's object mapping.
  const parser = parseCsv({
    bom: true,
    delimiter,
    quote: delimiter === '\t' ? null : '"',
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });
  decodeTextStream(filePath, encoding).pipe(parser);
  let count = 0;
  let widthMismatches = 0;
  let skipped = 0;
  let resolvedHeaders = headerNames;
  for await (const raw of parser) {
    const values = raw as string[];
    // Title/banner rows above the header are discarded before the header is interpreted, so the
    // header row below them is read as the header rather than as the first data row.
    if (skipped < skipRows) {
      skipped += 1;
      continue;
    }
    if (!resolvedHeaders) {
      // First record is the header row; consume it, don't emit it as data.
      resolvedHeaders = dedupeHeaders(values.map((header) => String(header).trim()));
      continue;
    }
    if (values.length !== resolvedHeaders.length) widthMismatches += 1;
    count += 1;
    const row: LocalDataRow = {};
    for (let index = 0; index < resolvedHeaders.length; index += 1) {
      row[resolvedHeaders[index]] = values[index] ?? null;
    }
    await onRow(
      options.flattenRules && Object.keys(options.flattenRules).length > 0
        ? flattenDelimitedRow(row, options.flattenRules, options.flattenMisses)
        : row,
      count,
    );
  }
  if (widthMismatches > 0 && options.warnRagged !== false) {
    process.stderr.write(
      `Warning: ${widthMismatches} record(s) had a column count different from the header row; extra fields were dropped and missing fields were treated as empty.\n`,
    );
  }
  return count;
}

async function streamJsonLines(
  filePath: string,
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
  options: StreamLocalDataOptions,
): Promise<number> {
  let count = 0;
  const lines = createInterface({ input: decodeTextStream(filePath, options.encoding ?? 'utf-8'), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    count += 1;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new CliValidationError('JSONL contains an invalid JSON record.', {
        code: 'LOCAL_DATA_JSONL_INVALID',
        location: { record: count },
      });
    }
    await onRow(flattenLocalDataRow(value, options.flattenRules, options.flattenMisses), count);
  }
  return count;
}

async function streamJson(
  filePath: string,
  selector: string,
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
  options: StreamLocalDataOptions,
): Promise<number> {
  let count = 0;
  const parser = createJsonParser();
  const streamer = selector === '$object'
    ? StreamValues.streamValues()
    : StreamArray.streamArray();
  const source = decodeTextStream(filePath, options.encoding ?? 'utf-8');
  const chain = selector === '$' || selector === '$object'
    ? source.pipe(parser).pipe(streamer)
    : source.pipe(parser).pipe(Pick.pick({ filter: selector })).pipe(streamer);
  for await (const item of chain as AsyncIterable<{ value: unknown }>) {
    count += 1;
    await onRow(flattenLocalDataRow(item.value, options.flattenRules, options.flattenMisses), count);
  }
  return count;
}

async function streamXlsx(
  filePath: string,
  sheetName: string,
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
  options: StreamLocalDataOptions,
): Promise<number> {
  const sheetDefinitions = await readXlsxSheetDefinitions(filePath);
  // `--merge-sheets` reads whatever the workbook offers, so hidden worksheets have to be dropped
  // here or scratch/lookup sheets would silently become uploaded rows. A named sheet is read as
  // asked, hidden or not — `selectDataSet` already reported that it is hidden.
  const targets = options.mergeSheets
    ? sheetDefinitions.filter((sheet) => !sheet.hidden)
    : sheetDefinitions.filter((sheet) => sheet.name === sheetName);
  if (options.mergeSheets) {
    const excluded = sheetDefinitions.filter((sheet) => sheet.hidden).map((sheet) => sheet.name);
    if (excluded.length > 0) {
      process.stderr.write(`Warning: skipped ${excluded.length} hidden worksheet(s): ${excluded.join(', ')}.\n`);
    }
  }
  if (targets.length === 0) {
    throw new CliValidationError('The requested Excel Sheet was not found.', { code: 'LOCAL_DATA_SET_NOT_FOUND' });
  }
  const archive = await unzipper.Open.file(filePath);
  const workbook = await readXlsxWorkbookContext(archive.files);

  const skipRows = Math.max(0, options.skipRows ?? 0);
  const collector = options.xlsxStructure;
  if (collector) collector.filled = Boolean(options.fillMergedCells);
  let count = 0;
  for (const definition of targets) {
    const worksheetEntry = archive.files.find((entry) => entry.path === definition.entryPath);
    if (!worksheetEntry) {
      throw new CliValidationError('The selected XLSX worksheet entry is missing.', {
        code: 'LOCAL_DATA_XLSX_INVALID',
        location: { field: 'input-file' },
      });
    }
    // Merge ranges and hidden markers sit outside the rows — `<mergeCells>` after `</sheetData>` —
    // so a pass over the row stream cannot see them. One extra pass over the same entry collects
    // them before the rows are read.
    const structure = collector || options.fillMergedCells || options.excludeHiddenRows
      ? await readXlsxSheetStructure(worksheetEntry)
      : EMPTY_XLSX_SHEET_STRUCTURE;
    if (collector) {
      collector.mergedRanges += structure.merged.length;
      collector.hiddenRowCount += structure.hiddenRows.size;
      for (const range of structure.merged) {
        if (collector.mergedRefs.length < XLSX_STRUCTURE_SAMPLE_LIMIT) collector.mergedRefs.push(range.ref);
      }
      for (const rowNumber of structure.hiddenRows) {
        if (collector.hiddenRows.length < XLSX_STRUCTURE_SAMPLE_LIMIT) collector.hiddenRows.push(rowNumber);
      }
    }
    const merges = structure.merged.length > 0
      ? new MergedRegionTracker(structure.merged, Boolean(options.fillMergedCells))
      : undefined;
    const hiddenRows = options.excludeHiddenRows ? structure.hiddenRows : undefined;
    let hiddenColumnsResolved = false;
    // Use ExcelJS' streaming WorksheetReader directly for the selected ZIP entry. WorkbookReader
    // has an entry-order race in 4.4.0 that can skip later Sheets in otherwise valid workbooks.
    const worksheet = new ExcelWorksheetReader({
      workbook,
      id: definition.id,
      iterator: worksheetEntry.stream(),
      options: { worksheets: 'emit', hyperlinks: 'ignore' },
    });
    // Header detection is per sheet so that merged multi-sheet streams re-read each sheet's header.
    let headers: string[] | undefined = options.headerNames;
    // Per sheet as well: a merged workbook repeats its title rows on every sheet.
    let skipped = 0;
    for await (const excelRow of worksheet) {
      const rawValues = Array.from({ length: Math.max(0, excelRow.cellCount) }, (_, index) =>
        readExcelCellValue(excelRow.getCell(index + 1)));
      const reads = rawValues.map(readExcelCell);
      const values = reads.map((read) => read.value);
      // Every row, including the title and header rows a merged banner covers: the value of a
      // merged block lives on the block's first row, so that row has to be seen even when it is
      // not emitted. Nothing is written here — `covered` below is what may write.
      merges?.observe(excelRow.number, values);
      // Discarded before the header branch below, so the header row under a title is read as the
      // header instead of becoming the first data row.
      if (skipped < skipRows) {
        skipped += 1;
        continue;
      }
      if (options.noHeader && !headers) {
        headers = values.map((_, index) => `col_${index + 1}`);
      }
      if (!headers) {
        headers = dedupeHeaders(values.map((value, index) => String(value ?? `column_${index + 1}`).trim()));
        continue;
      }
      if (values.every(isMissing)) continue;
      // Excluded after the blank check so the reported count is exactly the rows the run dropped.
      if (hiddenRows?.has(excelRow.number)) {
        if (collector) collector.excludedHiddenRows += 1;
        continue;
      }
      // A row blank apart from the cells a merge covers stays skipped above: filling it would turn
      // a merged block's own height into extra records.
      const covered = merges?.covered(excelRow.number, values);
      count += 1;
      if (collector) {
        if (!hiddenColumnsResolved) {
          hiddenColumnsResolved = true;
          for (const span of structure.hiddenColumns) {
            for (let column = span.min; column <= Math.min(span.max, headers.length); column += 1) {
              const header = headers[column - 1];
              if (header) collector.hiddenColumns.add(header);
            }
          }
        }
        for (const column of covered ?? []) {
          const header = headers[column - 1];
          if (!header) continue;
          collector.coveredCells.set(header, (collector.coveredCells.get(header) ?? 0) + 1);
        }
      }
      if (options.excelDateColumns) {
        rawValues.forEach((raw, index) => {
          const header = headers?.[index];
          if (header && isExcelDateCell(raw)) options.excelDateColumns?.add(header);
        });
      }
      const cellIssues = options.cellIssues;
      if (cellIssues) {
        reads.forEach((read, index) => {
          const header = headers?.[index];
          if (!read.issue || !header) return;
          const byColumn = cellIssues.get(read.issue) ?? new Map<string, number>();
          byColumn.set(header, (byColumn.get(header) ?? 0) + 1);
          cellIssues.set(read.issue, byColumn);
        });
      }
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null]));
      await onRow(
        options.flattenRules && Object.keys(options.flattenRules).length > 0
          ? flattenDelimitedRow(row, options.flattenRules)
          : row,
        count,
      );
    }
  }
  return count;
}

interface XlsxSheetDefinition {
  id: number;
  name: string;
  entryPath: string;
  /** `state="hidden"` or `"veryHidden"` on the workbook's sheet entry. */
  hidden: boolean;
}

async function readXlsxSheetDefinitions(filePath: string): Promise<XlsxSheetDefinition[]> {
  const archive = await unzipper.Open.file(filePath);
  const workbookEntry = archive.files.find((entry) => entry.path === 'xl/workbook.xml');
  const relationshipsEntry = archive.files.find((entry) => entry.path === 'xl/_rels/workbook.xml.rels');
  if (!workbookEntry || !relationshipsEntry) {
    throw new CliValidationError('XLSX workbook metadata is missing.', {
      code: 'LOCAL_DATA_XLSX_INVALID',
      location: { field: 'input-file' },
    });
  }
  // Parse the two small metadata parts with saxes and match element names by local name: a cleaning
  // tool that rewrites the default namespace as a prefix writes `<x:sheet>`, which the old `/sheet\b/`
  // regex missed and misread as "no readable sheets". The element name is matched locally, and the
  // `r:id` relationship reference is looked up by local name so `x:r:id` also resolves.
  const targets = new Map<string, string>();
  await parseXmlTags(relationshipsEntry, (tag) => {
    if (xmlLocalName(tag.name) !== 'Relationship') return;
    const id = xmlAttributeByLocalName(tag.attributes, 'Id');
    const target = xmlAttributeByLocalName(tag.attributes, 'Target');
    if (id && target) targets.set(id, target);
  });
  const sheets: XlsxSheetDefinition[] = [];
  await parseXmlTags(workbookEntry, (tag) => {
    if (xmlLocalName(tag.name) !== 'sheet') return;
    const relationshipId = xmlAttributeByLocalName(tag.attributes, 'id');
    const target = relationshipId ? targets.get(relationshipId) : undefined;
    const fileNumber = target?.match(/worksheets\/sheet(\d+)\.xml$/)?.[1];
    const name = xmlAttributeByLocalName(tag.attributes, 'name');
    if (!name || !relationshipId || !fileNumber) return;
    const state = xmlAttributeByLocalName(tag.attributes, 'state');
    sheets.push({
      id: Number(xmlAttributeByLocalName(tag.attributes, 'sheetId') ?? fileNumber),
      name: decodeXml(name),
      entryPath: normalizeXlsxEntryPath(target!),
      hidden: state === 'hidden' || state === 'veryHidden',
    });
  });
  if (sheets.length === 0) {
    throw new CliValidationError('XLSX workbook contains no readable Sheets.', {
      code: 'LOCAL_DATA_XLSX_INVALID',
      location: { field: 'input-file' },
    });
  }
  return sheets;
}

export interface ExcelSheetHeaders {
  name: string;
  headers: string[];
}

/**
 * Read only the header row of every sheet in an Excel workbook (XLS/XLSX) for
 * cross-sheet header consistency checking. Does not stream data rows.
 */
export async function readExcelSheetHeaders(filePath: string, format: 'xls' | 'xlsx'): Promise<ExcelSheetHeaders[]> {
  return format === 'xls' ? readXlsSheetHeaders(filePath) : readXlsxSheetHeaders(filePath);
}

function readXlsSheetHeaders(filePath: string): ExcelSheetHeaders[] {
  const workbook = XLSX.readFile(filePath, { dense: true });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = sheet
      ? (XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][])
      : [];
    return { name, headers: firstRowHeaders(rows[0] ?? []) };
  });
}

async function readXlsxSheetHeaders(filePath: string): Promise<ExcelSheetHeaders[]> {
  const sheetDefinitions = await readXlsxSheetDefinitions(filePath);
  const archive = await unzipper.Open.file(filePath);
  const workbook = await readXlsxWorkbookContext(archive.files);
  const sheets: ExcelSheetHeaders[] = [];
  for (const definition of sheetDefinitions) {
    // Hidden worksheets are excluded from merging, so their headers must not decide whether the
    // mergeable sheets agree; a stale hidden draft would otherwise report the workbook as ragged.
    if (definition.hidden) continue;
    const worksheetEntry = archive.files.find((entry) => entry.path === definition.entryPath);
    if (!worksheetEntry) continue;
    const worksheet = new ExcelWorksheetReader({
      workbook,
      id: definition.id,
      iterator: worksheetEntry.stream(),
      options: { worksheets: 'emit', hyperlinks: 'ignore' },
    });
    let headers: string[] = [];
    for await (const excelRow of worksheet) {
      const values = Array.from({ length: Math.max(0, excelRow.cellCount) }, (_, index) =>
        readExcelCell(readExcelCellValue(excelRow.getCell(index + 1))).value);
      headers = firstRowHeaders(values);
      break;
    }
    sheets.push({ name: definition.name, headers });
  }
  return sheets;
}

function firstRowHeaders(values: unknown[]): string[] {
  return dedupeHeaders(values.map((value, index) => String(value ?? `column_${index + 1}`).trim()));
}

/**
 * Peek up to `limit` raw rows from one XLSX worksheet, before any header interpretation — the
 * Excel counterpart of `peekDelimitedRecords`. Rows arrive in the same sequence `streamXlsx` sees
 * them, so an ordinal reported from here is the ordinal `--skip-rows` counts.
 */
export async function peekXlsxRows(filePath: string, sheetName: string, limit = 10): Promise<unknown[][]> {
  const sheetDefinitions = await readXlsxSheetDefinitions(filePath);
  const definition = sheetDefinitions.find((sheet) => sheet.name === sheetName);
  if (!definition) return [];
  const archive = await unzipper.Open.file(filePath);
  const worksheetEntry = archive.files.find((entry) => entry.path === definition.entryPath);
  if (!worksheetEntry) return [];
  const workbook = await readXlsxWorkbookContext(archive.files);
  const worksheet = new ExcelWorksheetReader({
    workbook,
    id: definition.id,
    iterator: worksheetEntry.stream(),
    options: { worksheets: 'emit', hyperlinks: 'ignore' },
  });
  const rows: unknown[][] = [];
  for await (const excelRow of worksheet) {
    rows.push(Array.from({ length: Math.max(0, excelRow.cellCount) }, (_, index) =>
      readExcelCell(readExcelCellValue(excelRow.getCell(index + 1))).value));
    if (rows.length >= limit) break;
  }
  return rows;
}

/**
 * The `workbook` object ExcelJS' WorksheetReader expects. Only these three members are read
 * (`worksheet-reader.js` line 144), and each one changes how cell values arrive:
 * `sharedStrings` resolves `t="s"` cells, `styles` supplies the number format that turns a
 * date-formatted cell into a Date, and `properties.model.date1904` picks the epoch.
 */
interface XlsxWorkbookContext {
  sharedStrings: unknown[];
  styles: { getStyleModel(id: number | string): { numFmt?: string } | null };
  properties: { model: { date1904?: boolean } };
}

const NO_XLSX_STYLES: XlsxWorkbookContext['styles'] = { getStyleModel: () => null };

/**
 * Excel number formats that measure elapsed time rather than a point in time. ExcelJS applies
 * its date conversion to these too, which would turn a 90-minute duration into a date in 1899.
 * Serving them without a number format keeps them numbers.
 */
const ELAPSED_TIME_FORMATS = new Set(['mm:ss', 'mmss.0', '[h]:mm:ss']);

function isElapsedTimeFormat(numFmt: string): boolean {
  return ELAPSED_TIME_FORMATS.has(numFmt.trim()) || /\[[hms]+\]/i.test(numFmt);
}

async function readXlsxWorkbookContext(files: unzipper.File[]): Promise<XlsxWorkbookContext> {
  const sharedStringsEntry = files.find((entry) => entry.path === 'xl/sharedStrings.xml');
  const stylesEntry = files.find((entry) => entry.path === 'xl/styles.xml');
  const workbookEntry = files.find((entry) => entry.path === 'xl/workbook.xml');
  return {
    sharedStrings: sharedStringsEntry ? await readXlsxSharedStrings(sharedStringsEntry) : [],
    styles: await readXlsxStyles(stylesEntry),
    properties: { model: { date1904: workbookEntry ? await readXlsxDate1904(workbookEntry) : false } },
  };
}

async function readXlsxStyles(entry: unzipper.File | undefined): Promise<XlsxWorkbookContext['styles']> {
  if (!entry) return NO_XLSX_STYLES;
  let styles: InstanceType<typeof ExcelStylesXform>;
  try {
    styles = new ExcelStylesXform();
    styles.init();
    await styles.parseStream(entry.stream());
  } catch {
    // A workbook whose styles part is unreadable still streams: only number formats are lost,
    // so fall back to reading every cell without one instead of failing the whole file.
    return NO_XLSX_STYLES;
  }
  return {
    getStyleModel: (id) => {
      let model: { numFmt?: string } | null;
      try {
        model = styles.getStyleModel(id);
      } catch {
        return null;
      }
      if (!model?.numFmt || !isElapsedTimeFormat(model.numFmt)) return model;
      const { numFmt, ...rest } = model;
      return rest;
    },
  };
}

async function readXlsxDate1904(entry: unzipper.File): Promise<boolean> {
  let date1904 = false;
  await parseXmlTags(entry, (tag) => {
    if (xmlLocalName(tag.name) !== 'workbookPr') return;
    const value = xmlAttributeByLocalName(tag.attributes, 'date1904');
    date1904 = value === '1' || value === 'true';
  });
  return date1904;
}

async function readXlsxSharedStrings(entry: unzipper.File): Promise<unknown[]> {
  const values: unknown[] = [];
  let inItem = false;
  let current = '';
  const parser = new SaxesParser();
  parser.on('opentag', (tag) => {
    if (xmlLocalName(tag.name) === 'si') {
      inItem = true;
      current = '';
    }
  });
  parser.on('text', (text) => {
    if (inItem) current += text;
  });
  parser.on('closetag', (tag) => {
    if (xmlLocalName(tag.name) === 'si') {
      values.push(current);
      inItem = false;
      current = '';
    }
  });
  // A StringDecoder because a chunk boundary can split a multi-byte character, and this table holds
  // every string the sheet displays: decoding each chunk on its own turns the split character into
  // replacement characters on both sides of the boundary, so a cell's text would reach AE corrupted.
  const decoder = new StringDecoder('utf8');
  for await (const chunk of entry.stream()) {
    parser.write(decoder.write(Buffer.from(chunk as Uint8Array)));
  }
  parser.write(decoder.end());
  parser.close();
  return values;
}

/** One `<mergeCell ref="A3:A5"/>` range, in the worksheet's own 1-based row and column numbers. */
interface XlsxMergedRange {
  ref: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** What a worksheet's XML says about structure that the row stream itself cannot report. */
interface XlsxSheetStructure {
  merged: XlsxMergedRange[];
  /** Rows carrying `hidden="1"`, as Excel numbers them. */
  hiddenRows: Set<number>;
  /** `<col hidden="1">` spans, kept as ranges: Excel writes `min="1" max="16384"` for a whole row. */
  hiddenColumns: Array<{ min: number; max: number }>;
}

const EMPTY_XLSX_SHEET_STRUCTURE: XlsxSheetStructure = {
  merged: [],
  hiddenRows: new Set(),
  hiddenColumns: [],
};

/**
 * Read the structure facts a streamed row cannot carry. `<mergeCells>` is written after
 * `</sheetData>`, so no single pass over the rows can know a cell was merged while it reads it, and
 * `row.hidden` never reaches the streaming reader at all. This is a second pass over the same ZIP
 * entry: more bytes read, no extra memory held, and no buffering of rows.
 *
 * A worksheet whose XML cannot be parsed yields no findings rather than failing the file — every
 * caller treats these as report-only signals, so degrading is better than refusing to read.
 */
async function readXlsxSheetStructure(entry: unzipper.File): Promise<XlsxSheetStructure> {
  const merged: XlsxMergedRange[] = [];
  const hiddenRows = new Set<number>();
  const hiddenColumns: Array<{ min: number; max: number }> = [];
  try {
    const parser = new SaxesParser();
    parser.on('opentag', (tag) => {
      const attributes = tag.attributes as Record<string, string>;
      if (xmlLocalName(tag.name) === 'mergeCell') {
        const range = parseMergedRef(attributes.ref ?? '');
        if (range) merged.push(range);
        return;
      }
      if (xmlLocalName(tag.name) === 'row') {
        const rowNumber = Number(attributes.r);
        if (isXlsxFlagSet(attributes.hidden) && Number.isInteger(rowNumber) && rowNumber >= 1) {
          hiddenRows.add(rowNumber);
        }
        return;
      }
      if (xmlLocalName(tag.name) === 'col' && isXlsxFlagSet(attributes.hidden)) {
        const min = Number(attributes.min);
        const max = Number(attributes.max);
        if (Number.isInteger(min) && min >= 1) {
          hiddenColumns.push({ min, max: Number.isInteger(max) && max >= min ? max : min });
        }
      }
    });
    // A StringDecoder because a chunk boundary can split a multi-byte character: inline strings in
    // this part hold the sheet's own text, and half a character would abort the whole scan.
    const decoder = new StringDecoder('utf8');
    for await (const chunk of entry.stream()) {
      parser.write(decoder.write(Buffer.from(chunk as Uint8Array)));
    }
    parser.write(decoder.end());
    parser.close();
  } catch {
    return EMPTY_XLSX_SHEET_STRUCTURE;
  }
  return { merged, hiddenRows, hiddenColumns };
}

function isXlsxFlagSet(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

function parseMergedRef(ref: string): XlsxMergedRange | undefined {
  const match = /^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) return undefined;
  const left = xlsxColumnNumber(match[1]);
  const top = Number(match[2]);
  const right = xlsxColumnNumber(match[3]);
  const bottom = Number(match[4]);
  if (right < left || bottom < top || top < 1) return undefined;
  return { ref: ref.trim().toUpperCase(), top, bottom, left, right };
}

/** `A` -> 1, `Z` -> 26, `AA` -> 27: the 1-based column number behind a cell reference. */
function xlsxColumnNumber(letters: string): number {
  let column = 0;
  for (const letter of letters.toUpperCase()) column = column * 26 + (letter.charCodeAt(0) - 64);
  return column;
}

/**
 * Tracks the merge ranges covering the row being read. Excel stores a merged block as one anchor
 * value plus empty cells, so every row of the block below its first reads the merged column as
 * missing — the value is on screen but not in the file. This is what reports those cells and, only
 * when `fill` is set, what copies the anchor into them.
 *
 * The copy never leaves the range, never overwrites a value the file does carry, and never invents
 * one for a block whose anchor is itself empty, so it can add nothing the workbook does not show.
 */
class MergedRegionTracker {
  private readonly pending: XlsxMergedRange[];
  private next = 0;
  private active: Array<{ range: XlsxMergedRange; anchor: unknown }> = [];

  constructor(ranges: XlsxMergedRange[], private readonly fill: boolean) {
    this.pending = [...ranges].sort((left, right) => left.top - right.top || left.left - right.left);
  }

  /** Advance to `rowNumber`, taking the anchor value of every range that starts on it. */
  observe(rowNumber: number, values: unknown[]): void {
    while (this.next < this.pending.length && this.pending[this.next].top <= rowNumber) {
      this.active.push({ range: this.pending[this.next], anchor: undefined });
      this.next += 1;
    }
    if (this.active.length === 0) return;
    this.active = this.active.filter((entry) => entry.range.bottom >= rowNumber);
    for (const entry of this.active) {
      if (entry.range.top === rowNumber) entry.anchor = values[entry.range.left - 1];
    }
  }

  /**
   * The 1-based columns whose cell on this row is empty only because a merge covers it, filled from
   * the anchor when enabled. `observe` must have run for the same row first.
   */
  covered(rowNumber: number, values: unknown[]): number[] {
    const columns: number[] = [];
    for (const entry of this.active) {
      if (isMissing(entry.anchor)) continue;
      const { range } = entry;
      for (let column = range.left; column <= range.right; column += 1) {
        if (range.top === rowNumber && column === range.left) continue;
        if (!isMissing(values[column - 1])) continue;
        columns.push(column);
        if (this.fill) values[column - 1] = entry.anchor;
      }
    }
    return columns;
  }
}

function normalizeXlsxEntryPath(target: string): string {
  const normalized = target.replace(/^\//, '');
  return normalized.startsWith('xl/') ? normalized : `xl/${normalized.replace(/^\.\//, '')}`;
}

/** Local part of an XML qualified name: `x:sheet` -> `sheet`, `sheet` -> `sheet`. */
function xmlLocalName(qname: string): string {
  const colon = qname.lastIndexOf(':');
  return colon === -1 ? qname : qname.slice(colon + 1);
}

/** Attribute value looked up by local name, so `r:id` and `x:r:id` both resolve as `id`. */
function xmlAttributeByLocalName(attributes: Record<string, string>, local: string): string | undefined {
  for (const [name, value] of Object.entries(attributes)) {
    if (xmlLocalName(name) === local) return value;
  }
  return undefined;
}

interface XmlOpenTag {
  name: string;
  attributes: Record<string, string>;
}

/**
 * Stream one small XML part and invoke `onOpenTag` for every start tag. saxes' default mode reports
 * the full qualified name (`x:sheet`), so callers match by `xmlLocalName(tag.name)`.
 */
async function parseXmlTags(entry: unzipper.File, onOpenTag: (tag: XmlOpenTag) => void): Promise<void> {
  const parser = new SaxesParser();
  parser.on('opentag', (tag) => {
    onOpenTag({ name: tag.name, attributes: tag.attributes as Record<string, string> });
  });
  // A StringDecoder because a chunk boundary can split a multi-byte character (a sheet name or the
  // workbook's own text), and half a character would abort the scan or corrupt a decoded name.
  const decoder = new StringDecoder('utf8');
  for await (const chunk of entry.stream()) {
    parser.write(decoder.write(Buffer.from(chunk as Uint8Array)));
  }
  parser.write(decoder.end());
  parser.close();
}

function decodeXml(source: string): string {
  return source
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function streamXls(
  filePath: string,
  sheetName: string,
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
  options: StreamLocalDataOptions,
): Promise<number> {
  const workbook = XLSX.readFile(filePath, { cellDates: true, dense: true });
  const names = options.mergeSheets
    ? workbook.SheetNames
    : (workbook.SheetNames.includes(sheetName) ? [sheetName] : []);
  if (names.length === 0) {
    throw new CliValidationError('The requested Excel Sheet was not found.', { code: 'LOCAL_DATA_SET_NOT_FOUND' });
  }
  let count = 0;
  const skipRows = Math.max(0, options.skipRows ?? 0);
  for (const name of names) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][];
    // Title/banner rows are dropped per sheet, before the header row is picked below.
    const rows = allRows.slice(skipRows);
    if (rows.length === 0) continue;
    let headers: string[] | undefined = options.headerNames;
    let start = 0;
    if (!headers) {
      if (options.noHeader) {
        headers = rows[0].map((_, index) => `col_${index + 1}`);
      } else {
        headers = dedupeHeaders(rows[0].map((value: unknown, index: number) => String(value ?? `column_${index + 1}`).trim()));
        start = 1;
      }
    }
    for (const values of rows.slice(start)) {
      if (values.every(isMissing)) continue;
      count += 1;
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null]));
      await onRow(
        options.flattenRules && Object.keys(options.flattenRules).length > 0
          ? flattenDelimitedRow(row, options.flattenRules)
          : row,
        count,
      );
    }
  }
  return count;
}

/**
 * ExcelJS builds a date cell as `new Date(Math.round((serial - 25569) * 86400000))`, so the wall
 * clock the user sees in Excel is in the Date's *UTC* components, not its local ones, and the
 * instant itself is meaningless. `conversion.ts` treats a `Date` as an absolute instant but routes
 * naive wall-clock strings through the source timezone, so emit the string: keeping the Date would
 * shift every timestamp by the source's UTC offset.
 */
function excelDateToWallClock(value: Date): string {
  const pad = (part: number, width = 2) => String(part).padStart(width, '0');
  const date = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  const [hours, minutes, seconds, ms] = [
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds(),
  ];
  if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) return date;
  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return ms === 0 ? `${date} ${time}` : `${date} ${time}.${pad(ms, 3)}`;
}

/**
 * Whether a cell arrived as a date because of its number format. Read before `readExcelCell` flattens it to a string, since the string is indistinguishable from a
 * timestamp the file stored as text — and only the former changes the type inspect used to report.
 */
function isExcelDateCell(value: ExcelJS.CellValue): boolean {
  if (value instanceof Date) return true;
  return Boolean(value && typeof value === 'object' && 'result' in value
    && (value as ExcelJS.CellFormulaValue).result instanceof Date);
}

/**
 * ExcelJS' `cell.value` getter loses a formula's cached result whenever that result is falsy:
 * `_copyModel` (`exceljs/lib/doc/cell.js`) copies each field under `if (value)`, so a cached `0`
 * or `""` is dropped and the cell arrives as a bare `{ formula }` — byte-identical to a formula
 * the file never computed. `cell.model` keeps the field, so read the result from there and let
 * the caller keep a real zero apart from a missing value.
 */
function readExcelCellValue(cell: ExcelJS.Cell): ExcelJS.CellValue {
  if (cell.type !== ExcelJS.ValueType.Formula) return cell.value;
  const model = (cell as unknown as { model?: { formula?: string; result?: unknown } }).model;
  if (!model || !('result' in model)) return cell.value;
  return { formula: model.formula ?? '', result: model.result } as ExcelJS.CellValue;
}

/** Fixed report order, so the same file always produces the same warnings in the same order. */
const CELL_ISSUE_ORDER: LocalDataCellIssue[] = ['formula_no_cached_value', 'error_value', 'unreadable_object'];

const CELL_ISSUE_MESSAGES: Record<LocalDataCellIssue, string> = {
  formula_no_cached_value:
    'hold a formula whose last computed result is not stored in the file, and were read as missing.'
    + ' Excel normally saves that result next to the formula; a file exported without it has no value to upload.'
    + ' Recalculate and re-export in Excel, or export values instead of formulas.'
    + ' This tool never evaluates a formula and never guesses a result.',
  error_value:
    'hold an Excel error value (#N/A, #DIV/0!, …), and were read as missing.'
    + ' Fix them in the source file if those cells were meant to carry data.',
  unreadable_object:
    'arrived in a cell shape this tool does not recognize, and were read as missing rather than'
    + ' passed on as an object. Report the file if these cells do carry data.',
};

/**
 * One warning per issue kind, naming the affected columns and per-column counts. Values are never
 * printed: a count says how much is missing without disclosing the source contents.
 */
export function cellIssueWarnings(cellIssues: Map<LocalDataCellIssue, Map<string, number>>): string[] {
  const warnings: string[] = [];
  for (const issue of CELL_ISSUE_ORDER) {
    const byColumn = cellIssues.get(issue);
    if (!byColumn || byColumn.size === 0) continue;
    const columns = [...byColumn.entries()].map(([column, count]) => `${column} (${count})`).join(', ');
    const total = [...byColumn.values()].reduce((sum, count) => sum + count, 0);
    warnings.push(`${total} cell(s) ${CELL_ISSUE_MESSAGES[issue]} Affected columns: ${columns}.`);
  }
  return warnings;
}

/** Flatten the collector into the manifest's plain-JSON shape (`issue -> column -> count`). */
export function cellIssueCounts(
  cellIssues: Map<LocalDataCellIssue, Map<string, number>>,
): Partial<Record<LocalDataCellIssue, Record<string, number>>> {
  const counts: Partial<Record<LocalDataCellIssue, Record<string, number>>> = {};
  for (const issue of CELL_ISSUE_ORDER) {
    const byColumn = cellIssues.get(issue);
    if (!byColumn || byColumn.size === 0) continue;
    counts[issue] = Object.fromEntries(byColumn);
  }
  return counts;
}

/** Findings from the XLSX structure pre-scan, accumulated across the worksheets a run reads. */
export interface XlsxStructureCollector {
  mergedRanges: number;
  /** A bounded sample of merge refs (`A3:A5`), enough to point the user at the layout. */
  mergedRefs: string[];
  /** Cells that read as missing only because a merge covers them, per column header. */
  coveredCells: Map<string, number>;
  /** Whether those cells were filled from the merge anchor. */
  filled: boolean;
  /** Hidden row numbers as Excel numbers them, bounded. */
  hiddenRows: number[];
  hiddenRowCount: number;
  /** Hidden rows actually left out of the stream (0 unless excluding them was requested). */
  excludedHiddenRows: number;
  /** Header names of columns hidden in the source worksheet. */
  hiddenColumns: Set<string>;
}

const XLSX_STRUCTURE_SAMPLE_LIMIT = 10;

export function createXlsxStructureCollector(): XlsxStructureCollector {
  return {
    mergedRanges: 0,
    mergedRefs: [],
    coveredCells: new Map(),
    filled: false,
    hiddenRows: [],
    hiddenRowCount: 0,
    excludedHiddenRows: 0,
    hiddenColumns: new Set(),
  };
}

/** The manifest/profile shape, or undefined when the pre-scan found nothing worth reporting. */
export function xlsxStructureReport(
  collector: XlsxStructureCollector,
): LocalDataXlsxStructure | undefined {
  const hasFindings = collector.mergedRanges > 0
    || collector.hiddenRowCount > 0
    || collector.hiddenColumns.size > 0;
  if (!hasFindings) return undefined;
  return {
    ...(collector.mergedRanges > 0
      ? {
        merged_ranges: collector.mergedRanges,
        merged_range_samples: collector.mergedRefs,
        merged_covered_cells: Object.fromEntries(collector.coveredCells),
        merged_cells_filled: collector.filled,
      }
      : {}),
    ...(collector.hiddenRowCount > 0
      ? {
        hidden_rows: collector.hiddenRowCount,
        hidden_row_samples: collector.hiddenRows,
        excluded_hidden_rows: collector.excludedHiddenRows,
      }
      : {}),
    ...(collector.hiddenColumns.size > 0 ? { hidden_columns: [...collector.hiddenColumns] } : {}),
  };
}

/**
 * One warning per finding. Column names and row numbers locate the problem; cell values are never
 * printed, so a warning says what is missing without disclosing the source contents.
 *
 * `excludedColumns` are the columns the run already drops (a mapping's `exclude_columns`), so a
 * hidden column is only worth a warning while it still reaches the output — otherwise the warning
 * would ask the user to do what they have already done.
 */
export function xlsxStructureWarnings(collector: XlsxStructureCollector, excludedColumns?: string[]): string[] {
  const warnings: string[] = [];
  const sample = (values: Array<string | number>, total: number): string =>
    values.join(', ') + (total > values.length ? ', …' : '');
  if (collector.coveredCells.size > 0) {
    const columns = [...collector.coveredCells.entries()]
      .map(([column, count]) => `${column} (${count})`)
      .join(', ');
    const total = [...collector.coveredCells.values()].reduce((sum, count) => sum + count, 0);
    warnings.push(collector.filled
      ? `${total} cell(s) were empty only because a merged block covers them, and were filled from`
        + ` the value on the block's first row. Affected columns: ${columns}.`
      : `${total} cell(s) are empty only because a merged block covers them: Excel shows the value`
        + ` on the block's first row only, so every row below it reads as missing.`
        + ` Affected columns: ${columns}.`
        + ' Pass --fill-merged-cells to copy each block\'s value down its own range,'
        + ' or unmerge and fill the column in the source file.');
  }
  if (collector.hiddenRowCount > 0) {
    const rows = sample(collector.hiddenRows, collector.hiddenRowCount);
    warnings.push(collector.excludedHiddenRows > 0
      ? `Skipped ${collector.excludedHiddenRows} row(s) hidden in the source worksheet`
        + ` (source row ${rows}).`
      : `${collector.hiddenRowCount} row(s) are hidden in the source worksheet (source row ${rows})`
        + ' and were read as data. Pass --exclude-hidden-rows to leave them out.');
  }
  if (collector.hiddenColumns.size > 0) {
    const excluded = new Set(excludedColumns ?? []);
    const kept = [...collector.hiddenColumns].filter((column) => !excluded.has(column));
    if (kept.length > 0) {
      warnings.push(`${kept.length} column(s) are hidden in the source worksheet`
        + ` and were read as data: ${kept.join(', ')}.`
        + ' List them in the mapping\'s exclude_columns to leave them out.');
    }
  }
  return warnings;
}

interface ExcelCellRead {
  value: unknown;
  issue?: LocalDataCellIssue;
}

/**
 * Normalize one XLSX cell, reporting the issue alongside the value rather than in a second pass.
 * Both come from one place so a counted cell is always the cell that read as missing.
 */
function readExcelCell(value: ExcelJS.CellValue): ExcelCellRead {
  if (value instanceof Date) return { value: excelDateToWallClock(value) };
  if (value && typeof value === 'object') {
    // An Excel error (#N/A, #DIV/0!) is a cell state, not a value; it may appear on its own or as
    // a formula's cached result. Either way there is nothing to upload.
    if ('error' in value) return { value: null, issue: 'error_value' };
    if ('formula' in value || 'sharedFormula' in value) {
      if (!('result' in value)) return { value: null, issue: 'formula_no_cached_value' };
      const result = (value as ExcelJS.CellFormulaValue).result;
      if (result === null || result === undefined) return { value: null, issue: 'formula_no_cached_value' };
      if (typeof result === 'object' && 'error' in result) return { value: null, issue: 'error_value' };
      // ExcelJS parses a `t="e"` cached result with `parseFloat`, so an error arrives as NaN.
      if (typeof result === 'number' && Number.isNaN(result)) return { value: null, issue: 'error_value' };
      if (result instanceof Date) return { value: excelDateToWallClock(result) };
      return { value: result };
    }
    if ('text' in value) return { value: String((value as ExcelJS.CellHyperlinkValue).text) };
    if ('richText' in value) {
      return { value: (value as ExcelJS.CellRichTextValue).richText.map((part) => part.text).join('') };
    }
    // No known shape left. Reporting it as unreadable keeps an object out of the upload path.
    return { value: null, issue: 'unreadable_object' };
  }
  return { value: value ?? null };
}

function dedupeHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header || `column_${index + 1}`;
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function localDataParseError(format: LocalDataFormat): CliValidationError {
  return new CliValidationError(`${format.toUpperCase()} input could not be parsed.`, {
    code: 'LOCAL_DATA_INPUT_INVALID',
    hint: 'Verify the file encoding and structure, then retry without changing the source file.',
    location: { field: 'input-file' },
  });
}

async function firstNonWhitespaceCharacter(filePath: string, encoding: string): Promise<string | undefined> {
  const stream = decodeTextStream(filePath, encoding);
  for await (const chunk of stream) {
    const match = String(chunk).match(/\S/);
    if (match) {
      stream.destroy();
      return match[0];
    }
  }
  return undefined;
}
