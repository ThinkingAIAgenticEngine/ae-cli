export type LocalDataFormat = 'csv' | 'tsv' | 'json' | 'jsonl' | 'xls' | 'xlsx';

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
