import { readFileSync } from 'node:fs';
import { CliValidationError } from '../../core/errors.js';
import { MAPPING_VERSION } from './types.js';
import type { LocalDataMapping } from './types.js';

const VALID_PROPERTY_NAME = /^[a-z][a-z0-9_]{0,49}$/;
/** Dotted `parent.child` sub-property declaration; each segment is a flat AE name. */
const VALID_CHILD_PROPERTY_NAME = /^[a-z][a-z0-9_]{0,49}(\.[a-z][a-z0-9_]{0,49})+$/;

/** Formats whose readers apply flatten_rules; add a new format here only after wiring its reader. */
const FLATTEN_SUPPORTED_FORMATS = ['csv', 'tsv', 'json', 'jsonl', 'xls', 'xlsx'];

/** Formats with a row order to skip. JSON/NDJSON records have no leading title rows. */
const SKIP_ROWS_SUPPORTED_FORMATS = ['csv', 'tsv', 'xls', 'xlsx'];

/** Merge ranges and hidden row/column flags are read from worksheet XML, which only .xlsx carries. */
const XLSX_STRUCTURE_SUPPORTED_FORMATS = ['xlsx'];
const XLSX_STRUCTURE_FIELDS = ['fill_merged_cells', 'exclude_hidden_rows'] as const;

export function readLocalDataMapping(raw: string, options?: { sourceWildcard?: boolean }): LocalDataMapping {
  const trimmed = raw.trim();
  let text: string;
  try {
    if (trimmed.startsWith('{')) {
      text = trimmed;
    } else {
      const filePath = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      text = readFileSync(filePath, 'utf8');
    }
  } catch {
    throw new CliValidationError('The local-data mapping could not be read.', {
      code: 'LOCAL_DATA_MAPPING_NOT_FOUND',
      location: { field: 'mapping' },
    });
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new CliValidationError('The local-data mapping is not valid JSON.', {
      code: 'LOCAL_DATA_MAPPING_INVALID_JSON',
      location: { field: 'mapping' },
    });
  }
  validateMapping(value, options);
  return value;
}

export function validateMapping(value: unknown, options?: { sourceWildcard?: boolean }): asserts value is LocalDataMapping {
  if (!isRecord(value) || value.version !== MAPPING_VERSION) {
    throw mappingError(`Mapping version must be ${MAPPING_VERSION}.`);
  }
  const sha256Valid = typeof value.source?.sha256 === 'string'
    && (options?.sourceWildcard
      ? value.source.sha256 === '*' || /^[a-f0-9]{64}$/i.test(value.source.sha256)
      : /^[a-f0-9]{64}$/i.test(value.source.sha256));
  if (!isRecord(value.source)
    || !sha256Valid
    || !['csv', 'tsv', 'json', 'jsonl', 'xls', 'xlsx'].includes(String(value.source.format))
    || typeof value.source.data_set !== 'string'
    || !value.source.data_set) {
    throw mappingError('Mapping source fingerprint and data set are required.');
  }
  if (value.mode !== 'track' && value.mode !== 'user_set' && value.mode !== 'mixed') {
    throw mappingError('Mapping mode must be track, user_set, or mixed.');
  }
  if (value.confidence !== 'high' && value.confidence !== 'medium' && value.confidence !== 'low') {
    throw mappingError('Mapping confidence must be high, medium, or low.');
  }
  const hasRandomIdentity = isRecord(value.random_pool)
    && ((Array.isArray(value.random_pool.account_ids) && value.random_pool.account_ids.length > 0)
      || (Array.isArray(value.random_pool.distinct_ids) && value.random_pool.distinct_ids.length > 0));
  if (!value.account_id_field && !value.distinct_id_field
    && !value.account_id_value && !value.distinct_id_value
    && !hasRandomIdentity) {
    throw mappingError('Mapping requires a real account or distinct ID field, a fixed identity value, or a random pool.');
  }
  if (!isRecord(value.time)
    || typeof value.time.field !== 'string'
    || !value.time.field
    || value.time.format !== 'auto'
    || typeof value.time.source_timezone !== 'string'
    || !isValidTimeZone(value.time.source_timezone)) {
    throw mappingError('Mapping requires a real time field and valid IANA source timezone.');
  }
  if (value.mode === 'mixed' && !value.record_type_field) {
    throw mappingError('Mixed mappings require record_type_field.');
  }
  if (value.mode !== 'user_set' && !value.event_name_field && !value.default_event_name) {
    throw mappingError('Track mappings require an event field or default event name.');
  }
  if (value.default_event_name && !VALID_PROPERTY_NAME.test(value.default_event_name)) {
    throw mappingError('The default event name is not a legal AE event name.');
  }
  if (!Array.isArray(value.properties)) throw mappingError('Mapping properties must be an array.');
  const targets = new Set<string>();
  const propertyTypes = new Map<string, { type: string; source: string }>();
  for (const property of value.properties) {
    if (!isRecord(property)
      || typeof property.source !== 'string'
      || typeof property.target !== 'string'
      || !(VALID_PROPERTY_NAME.test(property.target) || VALID_CHILD_PROPERTY_NAME.test(property.target))
      || !['number', 'string', 'boolean', 'datetime', 'list', 'object', 'array_row'].includes(String(property.type))
      || (property.transform !== undefined
        && !['stringify', 'number', 'boolean', 'json'].includes(String(property.transform)))
      || (property.value_mapping !== undefined && !isStringMap(property.value_mapping))
      || (property.time_format !== undefined
        && (typeof property.time_format !== 'string' || !property.time_format.trim() || property.time_format.length > 64))
      || (property.desc !== undefined
        && (typeof property.desc !== 'string' || !property.desc.trim() || property.desc.length > 200))) {
      throw mappingError('Every property mapping needs a source, legal AE target name, and supported type.');
    }
    if (targets.has(property.target)) throw mappingError('Property target names must be unique.');
    targets.add(property.target);
    propertyTypes.set(property.target, { type: String(property.type), source: property.source });
  }
  // A dotted target is a plan-only sub-property declaration: the first segment must name an
  // object/array_row property in the same pool, the child must be scalar or list (never a nested
  // object/array), and the child reads from its parent's source column — the nested value lives
  // inside the parent, so a child never reads a column of its own.
  for (const property of value.properties) {
    if (!property.target.includes('.')) continue;
    const parentName = property.target.split('.')[0];
    const parent = propertyTypes.get(parentName);
    if (!parent || (parent.type !== 'object' && parent.type !== 'array_row')) {
      throw mappingError(`The sub-property "${property.target}" references "${parentName}", which is not an object/array_row property in this mapping.`);
    }
    if (property.type === 'object' || property.type === 'array_row') {
      throw mappingError(`The sub-property "${property.target}" must be scalar or list, not ${property.type}.`);
    }
    if (property.source !== parent.source) {
      throw mappingError(`The sub-property "${property.target}" must read from the same source column as its parent "${parentName}".`);
    }
  }

  if (value.time_format !== undefined
    && (typeof value.time_format !== 'string' || !value.time_format.trim() || value.time_format.length > 64)) {
    throw mappingError('time_format must be a non-empty string of at most 64 characters.');
  }
  if (value.event_meta !== undefined) {
    if (!isRecord(value.event_meta)) throw mappingError('event_meta must be an object keyed by AE event name.');
    for (const [name, meta] of Object.entries(value.event_meta)) {
      if (!VALID_PROPERTY_NAME.test(name)
        || !isRecord(meta)
        || (meta.desc !== undefined && (typeof meta.desc !== 'string' || !meta.desc.trim() || meta.desc.length > 200))
        || (meta.tag !== undefined && (typeof meta.tag !== 'string' || !meta.tag.trim() || meta.tag.length > 64))) {
        throw mappingError('event_meta entries need a legal AE event name and non-empty desc/tag strings.');
      }
    }
  }
  if (value.value_mapping !== undefined) {
    if (!isRecord(value.value_mapping)) throw mappingError('value_mapping must be an object.');
    for (const key of ['account_id', 'distinct_id', 'event_name', 'record_type'] as const) {
      const map = value.value_mapping[key];
      if (map === undefined) continue;
      if (!isStringMap(map)) throw mappingError(`value_mapping.${key} must map strings to strings.`);
      if (key === 'event_name') {
        for (const target of Object.values(map)) {
          if (!VALID_PROPERTY_NAME.test(target)) {
            throw mappingError('value_mapping.event_name values must be legal AE event names.');
          }
        }
      }
    }
  }
  if (value.random_pool !== undefined) {
    if (!isRecord(value.random_pool)) throw mappingError('random_pool must be an object.');
    for (const key of ['account_ids', 'distinct_ids'] as const) {
      const pool = value.random_pool[key];
      if (pool !== undefined && !isNonEmptyStringArray(pool, true)) {
        throw mappingError(`random_pool.${key} must be a non-empty array of unique strings.`);
      }
    }
  }
  if (value.exclude_columns !== undefined && !isNonEmptyStringArray(value.exclude_columns, true)) {
    throw mappingError('exclude_columns must be a non-empty array of unique strings.');
  }
  if (value.flatten_rules !== undefined) {
    if (!isRecord(value.flatten_rules)) throw mappingError('flatten_rules must be an object of { column: dot.path }.');
    if (!FLATTEN_SUPPORTED_FORMATS.includes(String(value.source.format))) {
      throw mappingError(`flatten_rules are not supported for ${String(value.source.format)} input.`);
    }
    for (const [column, path] of Object.entries(value.flatten_rules)) {
      if (!VALID_PROPERTY_NAME.test(column) || typeof path !== 'string' || !path.trim()) {
        throw mappingError('flatten_rules keys must be legal AE property names and values must be non-empty dot paths.');
      }
    }
  }
  if (value.headers !== undefined && !isNonEmptyStringArray(value.headers, true)) {
    throw mappingError('headers must be a non-empty array of unique strings.');
  }
  if (value.skip_rows !== undefined) {
    if (typeof value.skip_rows !== 'number' || !Number.isInteger(value.skip_rows) || value.skip_rows < 1) {
      throw mappingError('skip_rows must be a positive integer.');
    }
    if (!SKIP_ROWS_SUPPORTED_FORMATS.includes(String(value.source.format))) {
      throw mappingError(`skip_rows is not supported for ${String(value.source.format)} input.`);
    }
  }
  for (const field of XLSX_STRUCTURE_FIELDS) {
    if (value[field] === undefined) continue;
    if (typeof value[field] !== 'boolean') {
      throw mappingError(`${field} must be a boolean when provided.`);
    }
    if (!XLSX_STRUCTURE_SUPPORTED_FORMATS.includes(String(value.source.format))) {
      throw mappingError(`${field} is not supported for ${String(value.source.format)} input.`);
    }
  }
  if (value.missing_time !== undefined && value.missing_time !== 'now') {
    throw mappingError('missing_time must be "now" when provided.');
  }
  if (value.ip_field !== undefined && (typeof value.ip_field !== 'string' || !value.ip_field.trim())) {
    throw mappingError('ip_field must be a non-empty column name.');
  }
  if (value.uuid_field !== undefined && (typeof value.uuid_field !== 'string' || !value.uuid_field.trim())) {
    throw mappingError('uuid_field must be a non-empty column name.');
  }
  if (value.zone_offset_value !== undefined && value.zone_offset_field !== undefined) {
    throw mappingError('zone_offset_value and zone_offset_field are mutually exclusive.');
  }
  if (value.zone_offset_value !== undefined) {
    if (typeof value.zone_offset_value === 'number') {
      if (!Number.isInteger(value.zone_offset_value) || value.zone_offset_value < -12 || value.zone_offset_value > 14) {
        throw mappingError('zone_offset_value must be an integer between -12 and 14.');
      }
    } else if (typeof value.zone_offset_value !== 'string' || !isValidTimeZone(value.zone_offset_value)) {
      throw mappingError('zone_offset_value must be an integer or a valid IANA timezone name.');
    }
  }
  if (value.zone_offset_field !== undefined && (typeof value.zone_offset_field !== 'string' || !value.zone_offset_field.trim())) {
    throw mappingError('zone_offset_field must be a non-empty column name.');
  }
  if (value.account_id_value !== undefined
    && (typeof value.account_id_value !== 'string' || !value.account_id_value.trim() || value.account_id_value.length > 128)) {
    throw mappingError('account_id_value must be a non-empty string of at most 128 characters.');
  }
  if (value.distinct_id_value !== undefined
    && (typeof value.distinct_id_value !== 'string' || !value.distinct_id_value.trim() || value.distinct_id_value.length > 128)) {
    throw mappingError('distinct_id_value must be a non-empty string of at most 128 characters.');
  }
}

export function isValidAeName(value: string): boolean {
  return VALID_PROPERTY_NAME.test(value);
}

/**
 * Every raw source column a mapping reads, sorted by name: properties, system-field
 * columns, and skipped columns. A flatten out-column is derived at transform time and
 * never a raw source column, so it is skipped and the raw column each rule reads from
 * (the first path segment) is added instead. This is the table-shape view that both the
 * shape gate and the reuse fingerprint key on.
 */
export function sourceColumns(mapping: LocalDataMapping): string[] {
  const columns = new Set<string>();
  const flattenOut = new Set(Object.keys(mapping.flatten_rules ?? {}));
  for (const property of mapping.properties) {
    if (!flattenOut.has(property.source)) columns.add(property.source);
  }
  for (const path of Object.values(mapping.flatten_rules ?? {})) {
    const root = path.split('.')[0];
    if (root) columns.add(root);
  }
  const systemFields = [
    mapping.account_id_field,
    mapping.distinct_id_field,
    mapping.record_type_field,
    mapping.event_name_field,
    mapping.time.field,
    mapping.ip_field,
    mapping.uuid_field,
    mapping.zone_offset_field,
  ];
  for (const field of systemFields) if (field) columns.add(field);
  for (const column of mapping.exclude_columns ?? []) columns.add(column);
  for (const header of mapping.headers ?? []) columns.add(header);
  return [...columns].sort();
}

function mappingError(message: string): CliValidationError {
  return new CliValidationError(message, {
    code: 'LOCAL_DATA_MAPPING_INVALID',
    location: { field: 'mapping' },
  });
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.keys(value).length > 0
    && Object.entries(value).every(([key, entry]) => key.length > 0 && typeof entry === 'string' && entry.length > 0);
}

function isNonEmptyStringArray(value: unknown, unique = false): value is string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((entry) => typeof entry === 'string' && entry.length > 0)) return false;
  return !unique || new Set(value).size === value.length;
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
