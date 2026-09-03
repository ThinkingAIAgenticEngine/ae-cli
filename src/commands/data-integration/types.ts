export type LocalDataFormat = 'csv' | 'tsv' | 'json' | 'jsonl' | 'xls' | 'xlsx';

/**
 * Cells that reached a row carrying no value this tool may use. Their values are read as missing
 * and counted per column, because the alternative is worse in both directions: a raw `{ formula }`
 * object uploaded as an AE property value locks that property to an object type, and a guessed
 * result is invented data. The tool never evaluates a formula.
 */
export type LocalDataCellIssue = 'formula_no_cached_value' | 'error_value' | 'unreadable_object';

export interface LocalDataSet {
  id: string;
  kind: 'file' | 'sheet' | 'json-path';
  label: string;
  selector?: string;
}

export type InferredValueType =
  | 'null'
  | 'boolean'
  | 'number'
  | 'datetime'
  | 'string'
  | 'list'
  | 'object';

export type UeRecordType =
  | 'track'
  | 'user_set'
  | 'user_setOnce'
  | 'user_add'
  | 'user_unset'
  | 'user_del'
  | 'user_append'
  | 'user_uniq_append';

export type UePropertyType = 'number' | 'string' | 'boolean' | 'datetime' | 'list' | 'object' | 'array_row';

/** Header-row detection verdict for delimited input (bounded sample of raw records). */
export interface HeaderDetection {
  hasHeaders: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * XLSX layout facts a streamed row cannot carry: merged blocks and hidden rows/columns live outside
 * the row data, so they are collected in a separate pass over the worksheet XML. Every field is
 * report-only unless the run explicitly asked for the matching behaviour, and none of them holds
 * cell text — a merged block is located by its reference, a hidden row by its number.
 */
export interface LocalDataXlsxStructure {
  /** Merged ranges found in the worksheets this run read. */
  merged_ranges?: number;
  /** Bounded sample of merge references (`A3:A5`), enough to locate the layout in Excel. */
  merged_range_samples?: string[];
  /** Cells that read as missing only because a merged block covers them, per column header. */
  merged_covered_cells?: Record<string, number>;
  /** Whether those cells were filled from their block's own value (`fill_merged_cells`). */
  merged_cells_filled?: boolean;
  /** Rows carrying Excel's hidden flag. */
  hidden_rows?: number;
  /** Bounded sample of hidden row numbers, as Excel numbers them in the source worksheet. */
  hidden_row_samples?: number[];
  /** Hidden rows actually left out of the run (0 unless `exclude_hidden_rows` was set). */
  excluded_hidden_rows?: number;
  /** Header names of columns hidden in the source worksheet; they were read as data. */
  hidden_columns?: string[];
}

/** One node of a bounded recursive structure surfaced by inspect: NDJSON/JSON records (record-root paths) or a delimited/Excel JSON-encoded object column (cell-relative paths). */
export interface NestedNode {
  /** Dot path from the record root, e.g. `user_info.address`. */
  path: string;
  /** Final path segment. */
  name: string;
  kind: 'object' | 'array' | 'primitive';
  /** Primitive leaves only. */
  inferredType?: 'boolean' | 'number' | 'datetime' | 'string';
  /** Primitive leaves only: dominant raw JS value category across samples. */
  valueKind?: 'string' | 'number' | 'boolean' | 'mixed';
  /** Array nodes only. */
  elementKind?: 'object' | 'primitive';
  children?: NestedNode[];
  /** Primitive leaves only: up to 5 distinct truncated samples. */
  samples?: string[];
  /** At least one sampled row held a non-empty value at this path. */
  nonEmpty?: boolean;
}

/**
 * One row of a column's value-frequency table. Counted after truncation, so two long values that
 * share their first 40 characters are counted as one — which is why the table is only reported for
 * columns whose distinct values fit the tracked budget.
 */
export interface LocalDataValueFrequency {
  /** The value as text, truncated the same way `samples` are. */
  value: string;
  /** Rows carrying this value. */
  count: number;
  /** Share of the column's non-missing rows. */
  ratio: number;
}

/** Distribution of a numeric column, for judging whether its values are worth uploading. */
export interface LocalDataNumericSummary {
  /** Non-missing values that read as a number; below the column's own non-missing count when values are mixed. */
  count: number;
  min: number;
  max: number;
  /** Column total. A row equal to this is a summary line, not an observation. */
  sum: number;
  mean: number;
  p25: number;
  median: number;
  p75: number;
  /** Quantiles came from a bounded sample of the values rather than all of them; count/min/max/sum/mean are always exact. */
  quantiles_approximate: boolean;
}

/**
 * A data row that reads as a summary line rather than an observation — the file's own 合计 / Total
 * row. Reported only: the row was profiled and `convert` writes it like any other, because a row
 * labelled 合计 is sometimes a real business record. Cell text is never included.
 */
export interface LocalDataSummaryRow {
  /** Data-row ordinal as the reader counts them; the numbering `invalid.rows.jsonl` and `--salvage-from` use. */
  row: number;
  /** What flagged the row. `total_label`: a cell reads as a total label. `column_total`: a number equals the total of its column's other rows. */
  signals: Array<'total_label' | 'column_total'>;
  /** Column holding the total-like label, when that is what flagged the row. */
  label_column?: string;
  /** Numeric columns whose value on this row equals the total of that column's other rows. */
  total_columns?: string[];
}

/**
 * Rows sharing one business key. The key's own text is never included — a group is identified by a
 * hash prefix, and the row ordinals are what makes the finding actionable.
 */
export interface LocalDataDuplicateKeyGroup {
  /** First 16 hex characters of the key's sha256. Distinguishes groups without revealing values. */
  key_hash: string;
  /** Rows carrying this key. `count - 1` of them would land in AE as extra events. */
  count: number;
  /** Data-row ordinals, in file order; the numbering `--salvage-from` uses. Bounded. */
  rows: number[];
  /** More rows carry this key than are listed. */
  rows_truncated?: boolean;
}

/**
 * Rows the source repeats under the same business key. Reported only: a repeat is sometimes a real
 * pair of records (one order line per product), and AE has no way to un-send an event, so the
 * decision belongs to the user before upload rather than to a filter during it.
 */
export interface LocalDataDuplicateKeyReport {
  /** Columns whose combined value was compared, in the order they were joined. */
  key_columns: string[];
  /** Rows that carried a value in every key column; rows missing part of their key identify nothing and were skipped. */
  checked_rows: number;
  /** Distinct keys seen on more than one row. */
  duplicate_groups: number;
  /** Extra copies across all groups — how many surplus records an upload would carry. */
  extra_rows: number;
  /** The largest groups, most repeated first. Bounded. */
  groups: LocalDataDuplicateKeyGroup[];
  /** More groups were found than are listed. */
  groups_truncated?: boolean;
  /** Distinct keys exceeded the tracking budget; keys first seen after that point were not compared. */
  tracking_truncated?: boolean;
}

export interface LocalDataColumnProfile {
  name: string;
  inferred_type: Exclude<InferredValueType, 'null'> | 'unknown' | 'mixed';
  missing_count: number;
  missing_ratio: number;
  unique_count: number;
  unique_ratio: number;
  unique_count_approximate: boolean;
  time_parse_count: number;
  time_parse_ratio: number;
  /** Bounded inspect-only samples: up to 5 distinct, truncated values. */
  samples?: string[];
  /** Inspect-only: the most frequent values, present only for columns with few enough distinct values to count them all. */
  value_frequency?: LocalDataValueFrequency[];
  /** Inspect-only: distribution of the values that read as numbers, present for numeric columns. */
  numeric_summary?: LocalDataNumericSummary;
  /** Delimited/Excel input only: bounded nested tree of a JSON-encoded object column (cell-relative paths). */
  nested_tree?: NestedNode[];
}

/** A column whose name matches account/distinct patterns; surfaced for the identity-mapping confirmation. */
export interface IdentityCandidate {
  name: string;
  kind: 'account' | 'distinct';
  unique_ratio: number;
  missing_ratio: number;
}

/** Schema version of the `ae-data-integration-mapping` document. Bump only on a non-backward-compatible change. */
export const MAPPING_VERSION = 'ae-data-integration-mapping/v1' as const;

export interface LocalDataMapping {
  version: typeof MAPPING_VERSION;
  source: {
    sha256: string;
    format: LocalDataFormat;
    data_set: string;
  };
  mode: 'track' | 'user_set' | 'mixed';
  confidence: 'high' | 'medium' | 'low';
  account_id_field?: string;
  distinct_id_field?: string;
  /** Fixed placeholder account ID used when the account column is absent or empty (explicit user decision). */
  account_id_value?: string;
  /** Fixed placeholder distinct ID used when the distinct column is absent or empty (explicit user decision). */
  distinct_id_value?: string;
  time: {
    field: string;
    format: string;
    source_timezone: string;
  };
  /** Explicit strptime pattern for the time field; overrides auto-detection. */
  time_format?: string;
  record_type_field?: string;
  event_name_field?: string;
  default_event_name?: string;
  /** Per-event business metadata keyed by AE event name: description and tag for the tracking plan. */
  event_meta?: Record<string, { desc?: string; tag?: string }>;
  /** Exact-key string replacement per system field (business data keys, AE-name values). */
  value_mapping?: {
    account_id?: Record<string, string>;
    distinct_id?: Record<string, string>;
    event_name?: Record<string, string>;
    record_type?: Record<string, string>;
  };
  /** Synthetic identity pool used when the source field is absent. */
  random_pool?: {
    account_ids?: string[];
    distinct_ids?: string[];
  };
  /** Source columns skipped when building event properties. */
  exclude_columns?: string[];
  /** Nested flatten: { outColumn: 'dot.path' }. JSON/NDJSON paths are record-relative; CSV/TSV/Excel paths are <column>.<cell-relative path>. */
  flatten_rules?: Record<string, string>;
  /** Explicit column names for headerless files. Presence means the first row is data. */
  headers?: string[];
  /** Delimited/Excel only: leading rows discarded before the header row (title/banner rows). */
  skip_rows?: number;
  /**
   * XLSX only: copy each merged block's value into the cells its range covers. Off by default —
   * those cells are empty in the file, so filling them changes the data (bounded to the range).
   */
  fill_merged_cells?: boolean;
  /** XLSX only: leave rows hidden in the source worksheet out of the conversion. Off by default. */
  exclude_hidden_rows?: boolean;
  /** Fill a missing/empty #time with the current time, for user-profile rows only (explicit user decision). */
  missing_time?: 'now';
  /** Source column for the optional #ip system field (client IP; AE resolves geo). Event data only; a value that is not a valid IPv4/IPv6 is dropped from the row. */
  ip_field?: string;
  /** Source column for the optional #uuid system field (standard 36-character UUID, both data kinds). A non-UUID value is dropped from the row. */
  uuid_field?: string;
  /** Fixed #zone_offset preset property (integer UTC hours -12..14, or an IANA name resolved to its offset). */
  zone_offset_value?: number | string;
  /** Source column whose per-row value is the #zone_offset integer UTC hours (-12..14). */
  zone_offset_field?: string;
  properties: Array<{
    source: string;
    target: string;
    type: UePropertyType;
    transform?: 'stringify' | 'number' | 'boolean' | 'json';
    value_mapping?: Record<string, string>;
    time_format?: string;
    /** Business description surfaced in the tracking plan (inferred, or user-provided when not inferable). */
    desc?: string;
  }>;
  warnings?: string[];
}

export interface LocalDataProfile {
  version: 'ae-local-data-profile/v1';
  source: {
    format: LocalDataFormat;
    size_bytes: number;
    sha256: string;
  };
  data_set: LocalDataSet;
  row_count: number;
  column_count: number;
  columns: LocalDataColumnProfile[];
  /** Columns whose names match account/distinct patterns; presented for the identity-mapping confirmation. */
  identity_candidates: IdentityCandidate[];
  recommended_mapping: LocalDataMapping;
  ue_eligible: boolean;
  warnings: string[];
  /** NDJSON/JSON only: bounded recursive structure for flatten decisions. */
  nested_tree?: NestedNode[];
  /** Delimited input only: set when inspect detected a missing header row. */
  no_headers?: boolean;
  header_detection?: HeaderDetection;
  auto_headers?: string[];
  /** XLS/XLSX only: whether every sheet shares the same header row. */
  header_consistency?: 'all_same' | 'different';
  /** XLS/XLSX only: per-sheet header rows, present when header_consistency is different. */
  header_details?: Array<{ name: string; headers: string[] }>;
  /** XLSX only: worksheets left out of the candidates and out of --merge-sheets because they are hidden. */
  excluded_sheets?: Array<{ name: string; reason: 'hidden'; data_set: string }>;
  /**
   * Leading rows that look like a title/banner above the real header row. Reported only: the run
   * still used the first row as the header. Ordinals count rows as the reader sees them, so they
   * are the value to pass to `--skip-rows`. Cell text is never included.
   */
  leading_title_rows?: Array<{ row: number; non_empty_cells: number }>;
  /**
   * XLSX only: the header-row verdict for the selected worksheet, present only when the first row
   * looks like data. Reported only — that row was still used as the header.
   */
  header_signal?: HeaderDetection;
  /** XLSX only: merged blocks and hidden rows/columns found by the worksheet-structure pre-scan. */
  xlsx_structure?: LocalDataXlsxStructure;
  /**
   * Rows that read as a summary line (合计 / 总计 / Total) rather than an observation. Reported
   * only: the rows stay in the profile and in everything `convert` writes, and the numbers reported
   * for their columns count them.
   */
  summary_rows?: LocalDataSummaryRow[];
  /**
   * Rows repeated under the same business key. Reported only: the rows stay in the profile and in
   * everything `convert` writes. Describes the source file as a whole, independent of `--salvage-from`.
   */
  duplicate_keys?: LocalDataDuplicateKeyReport;
  /** Leading rows actually discarded by `--skip-rows` for this run. */
  skipped_rows?: number;
}

export interface LocalDataManifest {
  version: 'ae-local-data-manifest/v1';
  run_id: string;
  created_at: string;
  status: 'ready' | 'blocked';
  /** Set when the run re-processed only previously invalid rows (salvage). */
  salvage_from?: string;
  source: {
    sha256: string;
    format: LocalDataFormat;
    data_set: string;
    size_bytes: number;
  };
  output: {
    valid_file: string;
    valid_sha256: string;
    invalid_file: string;
    /**
     * Data rows this run fed to conversion. Always equals `valid_records + invalid_records`: every
     * streamed row lands in exactly one bucket, so a mismatch means rows were dropped or duplicated
     * between the source and the output — the one failure the other counts cannot show on their own.
     * A salvage run reports only the rows it re-processed, not the whole file.
     */
    source_rows: number;
    valid_records: number;
    invalid_records: number;
    valid_bytes: number;
    record_types: Partial<Record<UeRecordType, number>>;
    /** System fields dropped per spec-violation code (`INVALID_IP`, `INVALID_UUID`); the row itself is kept. */
    skipped_fields?: Record<string, number>;
    /** Rows whose #ip is a private/LAN address (kept, but AE cannot geolocate it). */
    lan_ip_records?: number;
    /** Flatten out-columns that did not materialize for some rows (missing path / non-JSON cell); the row is kept. */
    flatten_misses?: Record<string, number>;
    /**
     * XLSX cells with no usable value (uncomputed formula, Excel error), as `issue -> column ->
     * count`. The cells were written as missing and the rows kept, so this is the only record that
     * a value was expected there.
     */
    unreadable_cells?: Partial<Record<LocalDataCellIssue, Record<string, number>>>;
    /**
     * XLSX only: merged blocks and hidden rows/columns in the source worksheet, and what this run
     * did about them. The record of a layout that the converted rows no longer show.
     */
    xlsx_structure?: LocalDataXlsxStructure;
    /**
     * Rows that read as a summary line (合计 / Total) rather than an observation, and were converted
     * into records like any other row. Repeated here because the manifest is what upload reads, and a
     * converted total row looks like ordinary data by then.
     */
    summary_rows?: LocalDataSummaryRow[];
    /**
     * Rows the source repeated under the same business key, all of them converted into records.
     * Repeated here because upload reads the manifest, and an event AE has already accepted cannot
     * be taken back. Covers the whole source file, including rows a salvage run did not re-process.
     */
    duplicate_keys?: LocalDataDuplicateKeyReport;
  };
  blocked_reasons: string[];
}

export type LocalDataRow = Record<string, unknown>;

export interface LocalDataTypeConflictSource {
  file: string;
  type: string;
  samples: string[];
}

export interface LocalDataTypeConflict {
  column: string;
  sources: LocalDataTypeConflictSource[];
}

export interface LocalDataColumnUnionEntry {
  column: string;
  per_file_types: Record<string, string>;
  has_conflict: boolean;
}

export interface LocalDataMultiProfile {
  version: 'ae-local-data-profile/v1';
  files: LocalDataProfile[];
  conflicts: LocalDataTypeConflict[];
  column_union: LocalDataColumnUnionEntry[];
}

export interface TypeResolution {
  action: 'unify' | 'split' | 'skip';
  unifiedType?: UePropertyType;
  fileMappings?: Record<string, { ae_name: string; type: UePropertyType }>;
  skipFiles?: string[];
}

export type TypeResolutions = Record<string, TypeResolution>;
