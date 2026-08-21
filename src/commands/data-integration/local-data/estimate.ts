import type { LocalDataFormat } from './types.js';

/** Size thresholds for the local-data size gate. */
export const XLS_SIZE_WARN_BYTES = 100 * 1024 * 1024; // XLS > 100 MB → memory risk warning
export const LARGE_FILE_WARN_BYTES = 1024 * 1024 * 1024; // non-XLS > 1 GB → time-estimate warning
export const XLS_HARD_LIMIT_BYTES = 1024 * 1024 * 1024; // XLS > 1 GB → still rejected (whole-workbook parse)

/**
 * Effective throughput (bytes/sec) for one full profile pass, per format. Runtime is
 * dominated by per-row, per-column work (parse + type inference), so throughput scales
 * with row width — verbose formats (JSON/JSONL) move more bytes/sec than compact CSV.
 * CSV and JSONL are calibrated against measured runs (1.2 GB / 30M rows ≈ 3.8 MB/s and
 * 300 MB / 2.8M rows ≈ 10.7 MB/s); JSON and XLSX are conservative estimates. The sha256
 * pass is I/O-bound and negligible.
 */
const THROUGHPUT_BYTES_PER_SECOND: Record<Exclude<LocalDataFormat, 'xls'>, number> = {
  jsonl: 10 * 1024 * 1024,
  json: 8 * 1024 * 1024,
  csv: 4 * 1024 * 1024,
  tsv: 4 * 1024 * 1024,
  xlsx: 2 * 1024 * 1024,
};

/** CJK text encodings decode through iconv-lite (pure JS), roughly half the throughput. */
const SLOW_ENCODINGS = new Set(['gbk', 'gb2312', 'gb18030', 'big5', 'shift_jis', 'euc-jp', 'euc-kr']);

/**
 * Estimate one command's processing time. One full profile pass dominates runtime
 * (row-by-row parse and type inference); the sha256 pass is negligible. XLS is
 * memory-gated, not time-gated, so it reports no estimate.
 */
export function estimateProcessingSeconds(format: LocalDataFormat, sizeBytes: number, encoding?: string): number {
  if (format === 'xls') return 0;
  let throughput = THROUGHPUT_BYTES_PER_SECOND[format];
  if (encoding && SLOW_ENCODINGS.has(encoding.toLowerCase())) throughput /= 2;
  return sizeBytes / throughput;
}

/** Render a ±50% time estimate as a human-readable range. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    const low = Math.max(1, Math.round(seconds * 0.5));
    const high = Math.max(low + 1, Math.round(seconds * 1.5));
    return `roughly ${low} to ${high} seconds`;
  }
  const low = Math.max(1, Math.round((seconds / 60) * 0.5));
  const high = Math.max(low + 1, Math.round((seconds / 60) * 1.5));
  return `roughly ${low} to ${high} minutes`;
}

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Memory risk warning for large legacy XLS workbooks. */
export function xlsMemoryWarning(fileName: string, sizeBytes: number): string {
  return `Warning: ${fileName} is ${humanSize(sizeBytes)} (XLS). The legacy XLS parser loads the entire workbook into memory, roughly 5-10x the file size. Prefer converting to XLSX or splitting the workbook first.`;
}

/** Processing-time warning for large streaming-format files. */
export function largeFileTimeWarning(
  fileName: string,
  sizeBytes: number,
  format: LocalDataFormat,
  encoding?: string,
): string {
  const duration = formatDuration(estimateProcessingSeconds(format, sizeBytes, encoding));
  return `Warning: ${fileName} is ${humanSize(sizeBytes)}; processing is estimated to take ${duration}. Consider splitting the file if that is too long.`;
}

/** Structured result of the size gate for one file, shared by stderr warnings and `--dry-run`. */
export interface LocalDataSizeAssessment {
  /** Human-readable size, e.g. "1.2 GB". */
  size: string;
  /** Human-readable duration range, e.g. "roughly 3 to 8 minutes"; null when not time-gated. */
  estimatedDuration: string | null;
  /** Warning text to surface, or null when the file needs no warning. */
  warning: string | null;
  /** Rejection reason to surface before execution; null when the file is accepted. */
  reason: string | null;
  /** True when the format has a known whole-structure memory path at this size. */
  memoryRisk: boolean;
  /** True when the file exceeds the hard ceiling and will be rejected. */
  rejected: boolean;
}

function largeFileMemoryWarning(format: LocalDataFormat): string | null {
  if (format === 'xlsx') {
    return "Memory risk: XLSX processing keeps the workbook's shared string table in memory, so peak memory can substantially exceed the file size.";
  }
  if (format === 'json') {
    return 'Memory risk: a JSON root object or a very large record may be materialized in memory during inspection, so peak memory can substantially exceed the file size.';
  }
  return null;
}

/** Evaluate the size gate for one file without reading it (beyond the encoding sample). */
export function assessFileSize(
  fileName: string,
  format: LocalDataFormat,
  sizeBytes: number,
  encoding?: string,
): LocalDataSizeAssessment {
  const baseAssessment: LocalDataSizeAssessment = {
    size: humanSize(sizeBytes),
    estimatedDuration: null,
    warning: null,
    reason: null,
    memoryRisk: false,
    rejected: false,
  };
  if (format === 'xls') {
    if (sizeBytes > XLS_HARD_LIMIT_BYTES) {
      return {
        ...baseAssessment,
        reason: 'XLS files larger than 1 GB are not supported; convert the workbook to XLSX or split it first.',
        memoryRisk: true,
        rejected: true,
      };
    }
    if (sizeBytes > XLS_SIZE_WARN_BYTES) {
      return {
        ...baseAssessment,
        warning: xlsMemoryWarning(fileName, sizeBytes),
        memoryRisk: true,
      };
    }
    return baseAssessment;
  }
  if (sizeBytes > LARGE_FILE_WARN_BYTES) {
    const memoryWarning = largeFileMemoryWarning(format);
    const timeWarning = largeFileTimeWarning(fileName, sizeBytes, format, encoding);
    return {
      ...baseAssessment,
      estimatedDuration: formatDuration(estimateProcessingSeconds(format, sizeBytes, encoding)),
      warning: memoryWarning ? `${timeWarning} ${memoryWarning}` : timeWarning,
      memoryRisk: Boolean(memoryWarning),
    };
  }
  return baseAssessment;
}
