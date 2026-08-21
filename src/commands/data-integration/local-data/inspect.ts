import { basename } from 'node:path';
import type { Command } from '../../../framework/types.js';
import { assessFileSize } from './estimate.js';
import { detectHeaderRow, inspectLocalDataInput, peekDelimitedRecords, readExcelSheetHeaders, resolveLocalDataInputMeta, selectDataSet } from './input.js';
import type { ExcelSheetHeaders, LocalDataInput } from './input.js';
import { buildColumnUnion, detectColumnTypeConflicts } from './multi.js';
import type { MultiFileProfile } from './multi.js';
import { profileLocalData } from './profile.js';
import type { HeaderDetection } from './types.js';

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
  ],
  risk: 'read',
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

    if (inputFiles.length === 1) {
      const input = await inspectLocalDataInput(inputFiles[0]);
      const headerConsistency = await readExcelHeaderConsistency(input);
      if (!requested && input.dataSets.length > 1) {
        return {
          version: 'ae-local-data-profile/v1',
          selection_required: true,
          source: { format: input.format, size_bytes: input.sizeBytes, sha256: input.sha256 },
          data_sets: input.dataSets,
          ...(headerConsistency ?? {}),
          next_step: 'Run inspect again with --data-set, then review the recommended mapping.',
        };
      }
      const dataSet = selectDataSet(input, requested);
      const headerPresence = headerNames || noHeader ? undefined : detectHeaderPresence(input);
      const profile = await profileLocalData(input, dataSet, sourceTimezone, {
        collectSamples: true,
        collectNestedTree: true,
        headerNames,
        noHeader: noHeader || Boolean(headerPresence),
      });
      const annotated = headerPresence ? annotateHeaderless(profile, headerPresence) : profile;
      return headerConsistency ? { ...annotated, ...headerConsistency } : annotated;
    }

    const files: MultiFileProfile[] = [];
    for (const inputFile of inputFiles) {
      const input = await inspectLocalDataInput(inputFile);
      const dataSet = selectDataSet(input);
      const headerPresence = headerNames || noHeader ? undefined : detectHeaderPresence(input);
      const profile = await profileLocalData(input, dataSet, sourceTimezone, {
        collectSamples: true,
        collectNestedTree: true,
        headerNames,
        noHeader: noHeader || Boolean(headerPresence),
      });
      const annotated = headerPresence ? annotateHeaderless(profile, headerPresence) : profile;
      const headerConsistency = await readExcelHeaderConsistency(input);
      files.push({
        file: basename(inputFile),
        profile: headerConsistency ? { ...annotated, ...headerConsistency } : annotated,
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
 */
export function detectHeaderPresence(input: LocalDataInput): {
  detection: HeaderDetection;
  autoHeaders: string[];
} | undefined {
  if (input.format !== 'csv' && input.format !== 'tsv') return undefined;
  const delimiter = input.delimiter ?? (input.format === 'tsv' ? '\t' : ',');
  const records = peekDelimitedRecords(input.filePath, { delimiter, encoding: input.encoding, limit: 10 });
  const detection = detectHeaderRow(records);
  if (detection.hasHeaders) return undefined;
  return {
    detection,
    autoHeaders: (records[0] ?? []).map((_, index) => `col_${index + 1}`),
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
