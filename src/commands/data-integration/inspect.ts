import { basename } from 'node:path';
import type { Command } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { assessFileSize } from './estimate.js';
import { detectHeaderRow, detectLeadingTitleRows, inspectLocalDataInput, peekDelimitedRecords, peekXlsxRows, readExcelSheetHeaders, resolveLocalDataInputMeta, selectDataSet } from './input.js';
import type { ExcelSheetHeaders, LocalDataInput } from './input.js';
import { buildColumnUnion, detectColumnTypeConflicts } from './multi.js';
import type { MultiFileProfile } from './multi.js';
import { profileLocalData } from './profile.js';
import type { HeaderDetection, LocalDataSet } from './types.js';

const HEADERLESS_WARNING =
  'The first row appears to be data, not a header; columns were auto-named col_1..col_N. Re-run with --headers to supply explicit names.';

export const dataIntegrationInspect: Command = {
  service: 'data-integration',
  command: 'inspect',
  usesAeHost: false,
  description: 'Stream one or more local CSV, TSV, TXT, JSON, JSONL, XLS, or XLSX files and recommend a UE mapping.',
  flags: [
    { name: 'input-file', type: 'string', required: true, sensitive: true, variadic: true, desc: 'Local CSV, TSV, TXT, JSON, JSONL, XLS, or XLSX file. Repeat for multiple files.' },
    { name: 'data-set', type: 'string', sensitive: true, desc: 'Sheet or JSON Path ID returned by a discovery-only inspection.' },
    { name: 'source-timezone', type: 'string', default: 'Asia/Shanghai', desc: 'IANA timezone used to interpret source times without an offset.' },
    { name: 'headers', type: 'string', sensitive: true, desc: 'Comma-separated explicit column names for a headerless file; the first row is data.' },
    { name: 'headerless', type: 'boolean', default: false, desc: 'Treat the first row as data and auto-generate col_1..col_N names.' },
    { name: 'skip-rows', type: 'number', default: 0, desc: 'Discard the first N rows before the header row is read, for exports with a title or banner above the header. Delimited and Excel only.' },
    { name: 'fill-merged-cells', type: 'boolean', default: false, desc: 'Copy each merged block value into the cells its own range covers, so rows below the first row of a merged block keep the value Excel displays. XLSX only; off by default because those cells are empty in the file.' },
    { name: 'exclude-hidden-rows', type: 'boolean', default: false, desc: 'Leave rows hidden in the source worksheet out of the profile. XLSX only; off by default because a hidden row may still be real data.' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const skipRows = ctx.num('skip-rows');
    if (!Number.isInteger(skipRows) || skipRows < 0) {
      throw new CliValidationError('Skipped rows must be a non-negative integer.', {
        code: 'LOCAL_DATA_SKIP_ROWS_INVALID',
        location: { field: 'skip-rows' },
      });
    }
  },
  // Fast size/time pre-check (stat + format/encoding sniff only — no sha256, no profile).
  // Lets agents surface the estimate before committing to a multi-minute full inspection.
  dryRun: async (ctx) => {
    const files = ctx.list('input-file').map((filePath: string) => {
      const meta = resolveLocalDataInputMeta(filePath);
      const assessment = assessFileSize(basename(filePath), meta.format, meta.sizeBytes, meta.encoding);
      return {
        file: basename(filePath),
        format: meta.format,
        size_bytes: meta.sizeBytes,
        size: assessment.size,
        ...(assessment.estimatedDuration ? { estimated_duration: assessment.estimatedDuration } : {}),
        ...(assessment.warning ? { warning: assessment.warning } : {}),
        ...(assessment.reason ? { reason: assessment.reason } : {}),
        ...(assessment.memoryRisk ? { memory_risk: true } : {}),
        ...(assessment.rejected ? { rejected: true } : {}),
      };
    });
    return {
      version: 'ae-local-data-estimate/v1',
      files,
      has_large_file: files.some((file) => Boolean(file.warning) || file.rejected),
    };
  },
  execute: async (ctx) => {
    const inputFiles = ctx.list('input-file');
    const headerNames = splitHeaders(ctx.str('headers'));
    const noHeader = ctx.bool('headerless');
    const sourceTimezone = ctx.str('source-timezone');
    const requested = ctx.str('data-set').trim() || undefined;
    const skipRows = ctx.num('skip-rows');
    const fillMergedCells = ctx.bool('fill-merged-cells');
    const excludeHiddenRows = ctx.bool('exclude-hidden-rows');

    if (inputFiles.length === 1) {
      const input = await inspectLocalDataInput(inputFiles[0]);
      const headerConsistency = await readExcelHeaderConsistency(input);
      const excludedSheets = summarizeExcludedSheets(input);
      if (!requested && input.dataSets.length > 1) {
        return {
          version: 'ae-local-data-profile/v1',
          selection_required: true,
          source: { format: input.format, size_bytes: input.sizeBytes, sha256: input.sha256 },
          data_sets: input.dataSets,
          ...excludedSheets,
          ...(headerConsistency ?? {}),
          next_step: 'Run inspect again with --data-set, then review the recommended mapping.',
        };
      }
      const dataSet = selectDataSet(input, requested);
      const headerPresence = headerNames || noHeader ? undefined : detectHeaderPresence(input, skipRows);
      const headerSignal = headerNames || noHeader ? undefined : await detectHeaderSignal(input, dataSet, skipRows);
      const profile = await profileLocalData(input, dataSet, sourceTimezone, {
        collectSamples: true,
        collectNestedTree: true,
        headerNames,
        noHeader: noHeader || Boolean(headerPresence),
        skipRows,
        fillMergedCells,
        excludeHiddenRows,
      });
      const annotated = headerPresence ? annotateHeaderless(profile, headerPresence) : profile;
      return {
        ...annotated,
        ...excludedSheets,
        ...(headerConsistency ?? {}),
        ...annotateRowSkips(annotated.warnings, skipRows, headerSignal),
      };
    }

    const files: MultiFileProfile[] = [];
    for (const inputFile of inputFiles) {
      const input = await inspectLocalDataInput(inputFile);
      const dataSet = selectDataSet(input);
      const headerPresence = headerNames || noHeader ? undefined : detectHeaderPresence(input, skipRows);
      const headerSignal = headerNames || noHeader ? undefined : await detectHeaderSignal(input, dataSet, skipRows);
      const profile = await profileLocalData(input, dataSet, sourceTimezone, {
        collectSamples: true,
        collectNestedTree: true,
        headerNames,
        noHeader: noHeader || Boolean(headerPresence),
        skipRows,
        fillMergedCells,
        excludeHiddenRows,
      });
      const annotated = headerPresence ? annotateHeaderless(profile, headerPresence) : profile;
      const headerConsistency = await readExcelHeaderConsistency(input);
      files.push({
        file: basename(inputFile),
        profile: {
          ...annotated,
          ...summarizeExcludedSheets(input),
          ...(headerConsistency ?? {}),
          ...annotateRowSkips(annotated.warnings, skipRows, headerSignal),
        },
      });
    }
    return {
      version: 'ae-local-data-profile/v1',
      files: files.map((entry) => entry.profile),
      conflicts: detectColumnTypeConflicts(files),
      column_union: buildColumnUnion(files),
    };
  },
};

/**
 * Name the data sets that were kept out of the candidates — currently hidden XLSX worksheets.
 * Without this the workbook simply reports fewer rows than the user sees a file for, with no way
 * to tell an intentional exclusion from a parse failure.
 */
function summarizeExcludedSheets(input: LocalDataInput): {
  excluded_sheets?: Array<{ name: string; reason: 'hidden'; data_set: string }>;
} {
  const excluded = input.excludedDataSets ?? [];
  if (excluded.length === 0) return {};
  return {
    excluded_sheets: excluded.map((dataSet) => ({ name: dataSet.label, reason: 'hidden', data_set: dataSet.id })),
  };
}

/**
 * Read cross-sheet header consistency for an Excel workbook. Returns nothing for
 * non-Excel input or a single-sheet workbook; for multi-sheet workbooks it reports
 * `all_same` or `different` (with per-sheet header details).
 */
async function readExcelHeaderConsistency(input: LocalDataInput): Promise<{
  header_consistency: 'all_same' | 'different';
  header_details?: Array<{ name: string; headers: string[] }>;
} | undefined> {
  if (input.format !== 'xls' && input.format !== 'xlsx') return undefined;
  return summarizeHeaderConsistency(await readExcelSheetHeaders(input.filePath, input.format));
}

function summarizeHeaderConsistency(sheets: ExcelSheetHeaders[]): {
  header_consistency: 'all_same' | 'different';
  header_details?: Array<{ name: string; headers: string[] }>;
} | undefined {
  if (sheets.length <= 1) return undefined;
  const first = JSON.stringify(sheets[0].headers);
  const allSame = sheets.every((sheet) => JSON.stringify(sheet.headers) === first);
  return allSame
    ? { header_consistency: 'all_same' }
    : { header_consistency: 'different', header_details: sheets.map((sheet) => ({ name: sheet.name, headers: sheet.headers })) };
}

/**
 * Detect a missing header row on delimited input using the bounded raw-record
 * peek. Returns nothing when the file has headers or is not delimited.
 * `skipRows` mirrors the reader: the rows it discards are not candidates for the header row.
 */
export function detectHeaderPresence(input: LocalDataInput, skipRows = 0): {
  detection: HeaderDetection;
  autoHeaders: string[];
} | undefined {
  if (input.format !== 'csv' && input.format !== 'tsv') return undefined;
  const delimiter = input.delimiter ?? (input.format === 'tsv' ? '\t' : ',');
  const peeked = peekDelimitedRecords(input.filePath, { delimiter, encoding: input.encoding, limit: 10 + skipRows });
  const records = peeked.slice(skipRows);
  const detection = detectHeaderRow(records);
  if (detection.hasHeaders) return undefined;
  return {
    detection,
    autoHeaders: (records[0] ?? []).map((_, index) => `col_${index + 1}`),
  };
}

/**
 * Read the header-row signals a title/banner row hides. Reported only — the run still used the
 * first row it read as the header — because a wrong auto-switch would be unrecoverable: Excel
 * exports legitimately carry numeric header rows (`2024`, `2025`) that trip the delimited
 * heuristic, and no flag can force a header row back once the first row is treated as data.
 *
 * The title-row scan covers delimited and XLSX alike (both readers honour `--skip-rows`); the
 * header verdict is added for XLSX only, because delimited input already gets it from
 * `detectHeaderPresence`, which acts on it.
 */
async function detectHeaderSignal(input: LocalDataInput, dataSet: LocalDataSet, skipRows: number): Promise<{
  detection?: HeaderDetection;
  titleRows: Array<{ row: number; non_empty_cells: number }>;
} | undefined> {
  const rows = await peekHeaderRows(input, dataSet, skipRows);
  if (!rows || rows.length === 0) return undefined;
  const titleRows = detectLeadingTitleRows(rows).map((title) => ({ ...title, row: title.row + skipRows }));
  if (input.format !== 'xlsx') return titleRows.length > 0 ? { titleRows } : undefined;
  const detection = detectHeaderRow(rows.map((row) => row.map((value) => (isEmptyCell(value) ? '' : String(value)))));
  if (detection.hasHeaders && titleRows.length === 0) return undefined;
  return { ...(detection.hasHeaders ? {} : { detection }), titleRows };
}

/** Raw rows as the reader will see them, past `skipRows`, or nothing for formats without a row order. */
async function peekHeaderRows(input: LocalDataInput, dataSet: LocalDataSet, skipRows: number): Promise<unknown[][] | undefined> {
  if (input.format === 'csv' || input.format === 'tsv') {
    const delimiter = input.delimiter ?? (input.format === 'tsv' ? '\t' : ',');
    return peekDelimitedRecords(input.filePath, { delimiter, encoding: input.encoding, limit: 10 + skipRows }).slice(skipRows);
  }
  if (input.format === 'xlsx' && dataSet.kind === 'sheet') {
    return (await peekXlsxRows(input.filePath, dataSet.label, 10 + skipRows)).slice(skipRows);
  }
  return undefined;
}

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

const TITLE_ROW_WARNING =
  'The first rows here hold a single value each, which looks like a title or banner above the real header row; the header was still read from the first row. See leading_title_rows and re-run with --skip-rows N if that is what they are.';
const EXCEL_HEADERLESS_WARNING =
  'The first row of this worksheet looks like data rather than a header, but it was still used as the header. See header_signal, and re-run with --headers or --headerless if it is data.';

/**
 * Attach the row-skip and Excel header signals. Both are report-only: they never change which row
 * the reader treated as the header, so a wrong signal costs a warning rather than a mis-typed AE
 * property (an AE property type is locked by the first value it receives).
 */
function annotateRowSkips(
  warnings: string[],
  skipRows: number,
  signal: { detection?: HeaderDetection; titleRows: Array<{ row: number; non_empty_cells: number }> } | undefined,
): {
  warnings: string[];
  skipped_rows?: number;
  leading_title_rows?: Array<{ row: number; non_empty_cells: number }>;
  header_signal?: HeaderDetection;
} {
  const extra: string[] = [];
  if (signal?.titleRows.length) extra.push(TITLE_ROW_WARNING);
  if (signal?.detection) extra.push(EXCEL_HEADERLESS_WARNING);
  return {
    warnings: extra.length > 0 ? [...warnings, ...extra] : warnings,
    ...(skipRows > 0 ? { skipped_rows: skipRows } : {}),
    ...(signal?.titleRows.length ? { leading_title_rows: signal.titleRows } : {}),
    ...(signal?.detection ? { header_signal: signal.detection } : {}),
  };
}

function annotateHeaderless(
  profile: Awaited<ReturnType<typeof profileLocalData>>,
  presence: { detection: HeaderDetection; autoHeaders: string[] },
): Awaited<ReturnType<typeof profileLocalData>> {
  return {
    ...profile,
    no_headers: true,
    header_detection: presence.detection,
    auto_headers: presence.autoHeaders,
    warnings: [...profile.warnings, HEADERLESS_WARNING],
  };
}

function splitHeaders(raw: string): string[] | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const headers = value.split(',').map((header) => header.trim()).filter((header) => header.length > 0);
  return headers.length > 0 ? headers : undefined;
}
