import { readFileSync } from 'node:fs';
import type { DataType } from 'apache-arrow';
import { CliValidationError } from '../../core/errors.js';
import type { LocalDataRow } from './types.js';

/**
 * Arrow `Type` enum values (the stable, non-negative values written to the IPC payload).
 * Numeric literals instead of an apache-arrow runtime import: the reader lazy-loads both
 * parquet-wasm and apache-arrow on first use, so non-parquet runs never pay their startup cost.
 */
const TypeId = {
  Int: 2,
  Float: 3,
  Binary: 4,
  Utf8: 5,
  Bool: 6,
  Decimal: 7,
  Date: 8,
  Timestamp: 10,
  List: 12,
  Struct: 13,
  FixedSizeBinary: 15,
  FixedSizeList: 16,
  Map: 17,
  LargeBinary: 19,
  LargeUtf8: 20,
  LargeList: 21,
} as const;

/**
 * Convert one Arrow value to a plain JS value a `LocalDataRow` can carry. 64-bit integers
 * arrive as bigint and become decimal strings (lossless — a bigint is not JSON-serializable);
 * tz-aware timestamps become absolute `Date`s, naive ones wall-clock strings; decimals get
 * their decimal point re-inserted from the schema's scale; nested List/Struct/Map values stay
 * nested object/array (the profile re-infers object/list, exactly as JSON/JSONL input does).
 */
function toJsValue(value: unknown, type: DataType): unknown {
  if (value === null || value === undefined) return null;
  switch (type.typeId) {
    case TypeId.Int:
      return typeof value === 'bigint' ? String(value) : value;
    case TypeId.Float:
    case TypeId.Bool:
    case TypeId.Utf8:
    case TypeId.LargeUtf8:
      return value;
    case TypeId.Binary:
    case TypeId.LargeBinary:
    case TypeId.FixedSizeBinary:
      return Buffer.from(value as Uint8Array).toString('hex');
    case TypeId.Timestamp:
      return toTimestampValue(value as number, type as { timezone?: string | null });
    case TypeId.Date:
      // Parquet DATE (date32/date64) carries no time or zone; apache-arrow normalizes it to epoch-ms
      // at midnight. Emit the wall-clock date string (the same shape `excelDateToWallClock` uses),
      // so a `dt` date column can serve as the time field.
      return toWallClockString(new Date(value as number));
    case TypeId.Decimal:
      return toDecimalValue(String(value), (type as unknown as { scale: number }).scale);
    case TypeId.List:
    case TypeId.LargeList:
    case TypeId.FixedSizeList: {
      const childType = type.children[0].type;
      return Array.from(value as Iterable<unknown>, (item) => toJsValue(item, childType));
    }
    case TypeId.Struct: {
      const row = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const child of type.children) out[child.name] = toJsValue(row[child.name], child.type);
      return out;
    }
    case TypeId.Map: {
      // Arrow models a Map as Struct<key, value>; MapRow iterates [key, value] pairs.
      const valueType = type.children[0].type.children[1].type;
      const out: Record<string, unknown> = {};
      for (const [key, val] of value as Iterable<[unknown, unknown]>) {
        out[String(key)] = toJsValue(val, valueType);
      }
      return out;
    }
    default:
      return value;
  }
}

/**
 * `isAdjustedToUTC=true` becomes an absolute instant (a `Date`, routed through the source
 * timezone by `normalizeTime`); `isAdjustedToUTC=false` is a wall clock whose components must be
 * read as UTC, so emit the same wall-clock string `excelDateToWallClock` produces for Excel dates.
 */
function toTimestampValue(ms: number, type: { timezone?: string | null }): Date | string {
  const date = new Date(ms);
  if (type.timezone) return date;
  return toWallClockString(date);
}

function toWallClockString(date: Date): string {
  const pad = (part: number, width = 2) => String(part).padStart(width, '0');
  const ymd = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();
  if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) return ymd;
  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return ms === 0 ? `${ymd} ${time}` : `${ymd} ${time}.${pad(ms, 3)}`;
}

/** Arrow decimals arrive unscaled (`9007199254740993.1234` → `90071992547409931234`); restore the point. */
function toDecimalValue(unscaled: string, scale: number): string {
  if (scale <= 0) return unscaled;
  const negative = unscaled.startsWith('-');
  const digits = negative ? unscaled.slice(1) : unscaled;
  const padded = digits.padStart(scale + 1, '0');
  const whole = padded.slice(0, padded.length - scale);
  const fraction = padded.slice(padded.length - scale).replace(/0+$/, '');
  const sign = negative ? '-' : '';
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

/** Footer-only schema summary, used to verify same-shape parquet files without decoding data. */
export interface ParquetSchemaInfo {
  /** Column name + canonical Arrow type string, e.g. `{ name: 'account_id', type: 'Int64' }`. */
  columns: Array<{ name: string; type: string }>;
  /** Stable equality key over columns: `name:type` joined, so identical schemas compare equal. */
  signature: string;
  /** Total row count from the file footer (sum of row groups). */
  numRows: number;
}

/**
 * Read a Parquet file's schema and row count from the footer only — no data-plane decode. `readSchema`
 * returns the Arrow schema and `readMetadata` the row count, both from the footer, so this is orders of
 * magnitude cheaper than `streamParquet` for a large file (the bytes are still read from disk, but local
 * I/O is cheap; the expensive step is decoding column data, which this never does). Used by multi-file
 * inspect to confirm N same-shape files with one full profile instead of N.
 */
export async function readParquetSchema(filePath: string): Promise<ParquetSchemaInfo> {
  // Lazy-load for the same reason as `streamParquet`: non-parquet runs never pay wasm startup.
  const { readSchema, readMetadata } = await import('parquet-wasm');
  const { tableFromIPC } = await import('apache-arrow');

  try {
    const bytes = new Uint8Array(readFileSync(filePath));
    const metadata = readMetadata(bytes);
    const numRows = metadata.fileMetadata().numRows();
    metadata.free();
    const table = tableFromIPC(readSchema(bytes).intoIPCStream());
    const columns = table.schema.fields.map((field) => ({ name: field.name, type: field.type.toString() }));
    return {
      columns,
      signature: columns.map((column) => `${column.name}:${column.type}`).join('|'),
      numRows,
    };
  } catch {
    throw new CliValidationError('The file could not be read as Parquet.', {
      code: 'LOCAL_DATA_PARQUET_INVALID',
      hint: 'Verify the file is a valid Parquet file and retry without changing the source file.',
      location: { field: 'input-file' },
    });
  }
}

/**
 * Stream a Parquet file's rows as `LocalDataRow`s. The schema provides the column names (Parquet
 * has no header row); values are emitted as typed JS values (see `toJsValue`). The whole file is
 * decoded in one pass — parquet-wasm's `readParquet` materializes the file, and the truly
 * row-group-streaming `ParquetFile.stream()` wants a URL rather than local fs.
 */
export async function streamParquet(
  filePath: string,
  onRow: (row: LocalDataRow, rowNumber: number) => void | Promise<void>,
): Promise<number> {
  // Lazy-load: parquet-wasm's node build reads its 5.25MB wasm and instantiates it at module
  // load, so importing it at the top of this file would tax every run, CSV included.
  const { readParquet } = await import('parquet-wasm');
  const { tableFromIPC } = await import('apache-arrow');

  let table: ReturnType<typeof tableFromIPC>;
  try {
    const bytes = new Uint8Array(readFileSync(filePath));
    const wasmTable = readParquet(bytes);
    // intoIPCStream() consumes the wasm table, so it must not be freed afterwards.
    table = tableFromIPC(wasmTable.intoIPCStream());
  } catch {
    throw new CliValidationError('The file could not be read as Parquet.', {
      code: 'LOCAL_DATA_PARQUET_INVALID',
      hint: 'Verify the file is a valid Parquet file and retry without changing the source file.',
      location: { field: 'input-file' },
    });
  }

  const fields = table.schema.fields;
  const columns = fields.map((_, index) => table.getChildAt(index));
  let count = 0;
  for (let rowIndex = 0; rowIndex < table.numRows; rowIndex += 1) {
    const row: LocalDataRow = {};
    for (let columnIndex = 0; columnIndex < fields.length; columnIndex += 1) {
      const column = columns[columnIndex];
      if (!column) continue;
      row[fields[columnIndex].name] = toJsValue(column.get(rowIndex), fields[columnIndex].type);
    }
    count += 1;
    await onRow(row, count);
  }
  return count;
}
