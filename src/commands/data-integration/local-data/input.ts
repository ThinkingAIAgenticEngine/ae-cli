import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, basename } from 'node:path';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import ExcelJS from 'exceljs';
import XLSXMod from 'xlsx';
import { parse as parseCsv } from 'csv-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';
import createJsonParser from 'stream-json';
import Pick from 'stream-json/filters/Pick.js';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import StreamValues from 'stream-json/streamers/StreamValues.js';
import * as unzipper from 'unzipper';
import { SaxesParser } from 'saxes';
import { CliValidationError } from '../../../core/errors.js';
import { detectEncoding, decodeTextStream, decodeFileSample } from './encoding.js';
import { flattenDelimitedRow, flattenLocalDataRow } from './flatten.js';
import type { HeaderDetection, LocalDataFormat, LocalDataRow, LocalDataSet } from './types.js';

const MAX_STREAMING_FILE_BYTES = 200 * 1024 * 1024;
const MAX_XLS_FILE_BYTES = 50 * 1024 * 1024;
const XLSX = (XLSXMod as any).default ?? XLSXMod;
const require = createRequire(import.meta.url);
const ExcelWorksheetReader = require('exceljs/lib/stream/xlsx/worksheet-reader') as new (
  options: any,
) => ExcelJS.stream.xlsx.WorksheetReader;

export interface LocalDataInput {
  filePath: string;
  format: LocalDataFormat;
  sizeBytes: number;
  sha256: string;
  dataSets: LocalDataSet[];
  /** Delimiter for sniffed `.txt` content (`,` or `\t`); undefined for known extensions. */
  delimiter?: string;
  /** Detected text encoding for text formats; undefined for binary XLS/XLSX. */
  encoding?: string;
}

export async function inspectLocalDataInput(filePath: string): Promise<LocalDataInput> {
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
  const maxBytes = format === 'xls' ? MAX_XLS_FILE_BYTES : MAX_STREAMING_FILE_BYTES;
  if (sizeBytes > maxBytes) {
    throw new CliValidationError(
      `${format.toUpperCase()} input exceeds the supported file size limit.`,
      {
        code: 'LOCAL_DATA_FILE_TOO_LARGE',
        hint: `Split the file below ${format === 'xls' ? '50' : '200'} MB and retry.`,
        location: { field: 'input-file' },
      },
    );
  }

  if (format !== 'xls' && format !== 'xlsx' && !encoding) {
    encoding = detectEncoding(filePath);
  }

  try {
    return {
      filePath,
      format,
      sizeBytes,
      sha256: await sha256File(filePath),
      dataSets: await discoverDataSets(filePath, format),
      ...(delimiter ? { delimiter } : {}),
      ...(encoding ? { encoding } : {}),
    };
  } catch (error) {
    if (error instanceof CliValidationError) throw error;
    throw localDataParseError(format);
  }
}

export function selectDataSet(input: LocalDataInput, requested?: string): LocalDataSet {
  if (requested) {
    const selected = input.dataSets.find((candidate) =>
      candidate.id === requested || candidate.selector === requested || candidate.label === requested);
    if (!selected) {
      throw new CliValidationError('The requested Sheet or JSON Path was not found.', {
        code: 'LOCAL_DATA_SET_NOT_FOUND',
        hint: `Choose one of: ${input.dataSets.map((item) => item.id).join(', ')}`,
        location: { field: 'data-set' },
      });
    }
    return selected;
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
  /** NDJSON nested flatten rules: { outColumn: 'dot.path' }. */
  flattenRules?: Record<string, string>;
  /** Stream every worksheet in file order instead of a single selected sheet. */
  mergeSheets?: boolean;
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
    mergeSheets: options.mergeSheets,
  };
  try {
    switch (input.format) {
      case 'csv':
      case 'tsv':
        return await streamDelimited(input.filePath, onRow, opts);
      case 'jsonl':
        return await streamJsonLines(input.filePath, onRow, opts);
      case 'json':
        return await streamJson(input.filePath, dataSet.selector ?? '$', onRow, opts);
      case 'xlsx':
        return await streamXlsx(input.filePath, dataSet.label, onRow, opts);
      case 'xls':
        return await streamXls(input.filePath, dataSet.label, onRow, opts);
    }
  } catch (error) {
    if (error instanceof CliValidationError) throw error;
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

function escapeRegex(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNumeric(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !Number.isNaN(Number(trimmed));
}

async function discoverDataSets(filePath: string, format: LocalDataFormat): Promise<LocalDataSet[]> {
  if (format === 'csv' || format === 'tsv' || format === 'jsonl') {
    return [{ id: '$', kind: 'file', label: basename(filePath), selector: '$' }];
  }
  if (format === 'xls') {
    const workbook = XLSX.readFile(filePath, { dense: true });
    return workbook.SheetNames.map((name: string) => ({ id: `sheet:${name}`, kind: 'sheet', label: name, selector: name }));
  }
  if (format === 'xlsx') {
    return (await readXlsxSheetDefinitions(filePath)).map((sheet) => ({
      id: `sheet:${sheet.name}`,
      kind: 'sheet',
      label: sheet.name,
      selector: sheet.name,
    }));
  }
  return discoverJsonDataSets(filePath);
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
  let headerNames = options.headerNames;
  if (!headerNames && options.noHeader) {
    const firstRecord = peekDelimitedRecords(filePath, { delimiter, encoding, limit: 1 })[0] ?? [];
    headerNames = firstRecord.map((_, index) => `col_${index + 1}`);
  }

  const parser = parseCsv({
    bom: true,
    delimiter,
    quote: delimiter === '\t' ? null : '"',
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    columns: headerNames
      ? headerNames
      : (headers: string[]) => dedupeHeaders(headers.map((header) => String(header).trim())),
  });
  decodeTextStream(filePath, encoding).pipe(parser);
  let count = 0;
  for await (const value of parser) {
    count += 1;
    const row = normalizeDelimitedRow(value, headerNames);
    await onRow(
      options.flattenRules && Object.keys(options.flattenRules).length > 0
        ? flattenDelimitedRow(row, options.flattenRules)
        : row,
      count,
    );
  }
  return count;
}

function normalizeDelimitedRow(value: unknown, headerNames?: string[]): LocalDataRow {
  if (!headerNames || value === null || typeof value !== 'object' || Array.isArray(value)) {
    return normalizeRow(value);
  }
  const source = value as Record<string, unknown>;
  const row: LocalDataRow = {};
  for (const header of headerNames) row[header] = source[header] ?? null;
  return row;
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
    await onRow(flattenLocalDataRow(value, options.flattenRules), count);
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
    await onRow(flattenLocalDataRow(item.value, options.flattenRules), count);
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
  const targets = options.mergeSheets
    ? sheetDefinitions
    : sheetDefinitions.filter((sheet) => sheet.name === sheetName);
  if (targets.length === 0) {
    throw new CliValidationError('The requested Excel Sheet was not found.', { code: 'LOCAL_DATA_SET_NOT_FOUND' });
  }
  const archive = await unzipper.Open.file(filePath);
  const sharedStringsEntry = archive.files.find((entry) => entry.path === 'xl/sharedStrings.xml');
  const sharedStrings = sharedStringsEntry ? await readXlsxSharedStrings(sharedStringsEntry) : [];

  let count = 0;
  for (const definition of targets) {
    const worksheetEntry = archive.files.find((entry) => entry.path === definition.entryPath);
    if (!worksheetEntry) {
      throw new CliValidationError('The selected XLSX worksheet entry is missing.', {
        code: 'LOCAL_DATA_XLSX_INVALID',
        location: { field: 'input-file' },
      });
    }
    // Use ExcelJS' streaming WorksheetReader directly for the selected ZIP entry. WorkbookReader
    // has an entry-order race in 4.4.0 that can skip later Sheets in otherwise valid workbooks.
    const worksheet = new ExcelWorksheetReader({
      workbook: {
        sharedStrings,
        styles: { getStyleModel: () => null },
        properties: { model: {} },
      },
      id: definition.id,
      iterator: worksheetEntry.stream(),
      options: { worksheets: 'emit', hyperlinks: 'ignore' },
    });
    // Header detection is per sheet so that merged multi-sheet streams re-read each sheet's header.
    let headers: string[] | undefined = options.headerNames;
    for await (const excelRow of worksheet) {
      const values = Array.from({ length: Math.max(0, excelRow.cellCount) }, (_, index) =>
        normalizeExcelValue(excelRow.getCell(index + 1).value));
      if (options.noHeader && !headers) {
        headers = values.map((_, index) => `col_${index + 1}`);
      }
      if (!headers) {
        headers = dedupeHeaders(values.map((value, index) => String(value ?? `column_${index + 1}`).trim()));
        continue;
      }
      if (values.every(isMissing)) continue;
      count += 1;
      await onRow(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null])), count);
    }
  }
  return count;
}

interface XlsxSheetDefinition {
  id: number;
  name: string;
  entryPath: string;
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
  const [workbookXml, relationshipsXml] = await Promise.all([
    workbookEntry.buffer().then((value) => value.toString('utf8')),
    relationshipsEntry.buffer().then((value) => value.toString('utf8')),
  ]);
  const targets = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const attributes = parseXmlAttributes(match[1]);
    if (attributes.Id && attributes.Target) targets.set(attributes.Id, attributes.Target);
  }
  const sheets: XlsxSheetDefinition[] = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const attributes = parseXmlAttributes(match[1]);
    const relationshipId = attributes['r:id'];
    const target = relationshipId ? targets.get(relationshipId) : undefined;
    const fileNumber = target?.match(/worksheets\/sheet(\d+)\.xml$/)?.[1];
    if (!attributes.name || !relationshipId || !fileNumber) continue;
    sheets.push({
      id: Number(attributes.sheetId ?? fileNumber),
      name: decodeXml(attributes.name),
      entryPath: normalizeXlsxEntryPath(target!),
    });
  }
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
  const sharedStringsEntry = archive.files.find((entry) => entry.path === 'xl/sharedStrings.xml');
  const sharedStrings = sharedStringsEntry ? await readXlsxSharedStrings(sharedStringsEntry) : [];
  const sheets: ExcelSheetHeaders[] = [];
  for (const definition of sheetDefinitions) {
    const worksheetEntry = archive.files.find((entry) => entry.path === definition.entryPath);
    if (!worksheetEntry) continue;
    const worksheet = new ExcelWorksheetReader({
      workbook: {
        sharedStrings,
        styles: { getStyleModel: () => null },
        properties: { model: {} },
      },
      id: definition.id,
      iterator: worksheetEntry.stream(),
      options: { worksheets: 'emit', hyperlinks: 'ignore' },
    });
    let headers: string[] = [];
    for await (const excelRow of worksheet) {
      const values = Array.from({ length: Math.max(0, excelRow.cellCount) }, (_, index) =>
        normalizeExcelValue(excelRow.getCell(index + 1).value));
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

async function readXlsxSharedStrings(entry: unzipper.File): Promise<unknown[]> {
  const values: unknown[] = [];
  let inItem = false;
  let current = '';
  const parser = new SaxesParser();
  parser.on('opentag', (tag) => {
    if (tag.name === 'si') {
      inItem = true;
      current = '';
    }
  });
  parser.on('text', (text) => {
    if (inItem) current += text;
  });
  parser.on('closetag', (tag) => {
    if (tag.name === 'si') {
      values.push(current);
      inItem = false;
      current = '';
    }
  });
  for await (const chunk of entry.stream()) {
    parser.write(Buffer.from(chunk as Uint8Array).toString('utf8'));
  }
  parser.close();
  return values;
}

function normalizeXlsxEntryPath(target: string): string {
  const normalized = target.replace(/^\//, '');
  return normalized.startsWith('xl/') ? normalized : `xl/${normalized.replace(/^\.\//, '')}`;
}

function parseXmlAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(/([\w:-]+)="([^"]*)"/g)) attributes[match[1]] = match[2];
  return attributes;
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
  for (const name of names) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][];
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
      await onRow(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? null])), count);
    }
  }
  return count;
}

function normalizeRow(value: unknown): LocalDataRow {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as LocalDataRow;
  }
  return { value };
}

function normalizeExcelValue(value: ExcelJS.CellValue): unknown {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    if ('result' in value) return (value as ExcelJS.CellFormulaValue).result ?? null;
    if ('text' in value) return String((value as ExcelJS.CellHyperlinkValue).text);
    if ('richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText.map((part) => part.text).join('');
    }
  }
  return value ?? null;
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
