import { CliValidationError } from '../../../core/errors.js';
import { isValidAeName } from './mapping.js';
import type {
  LocalDataColumnUnionEntry,
  LocalDataMapping,
  LocalDataProfile,
  LocalDataTypeConflict,
  LocalDataTypeConflictSource,
  TypeResolution,
  TypeResolutions,
  UePropertyType,
} from './types.js';

const PROPERTY_TYPES: ReadonlySet<string> = new Set<UePropertyType>([
  'number', 'string', 'boolean', 'datetime', 'list', 'object',
]);

/** A profiled file plus its user-facing key (basename) for conflict/union/resolution data. */
export interface MultiFileProfile {
  file: string;
  profile: LocalDataProfile;
}

/** Per-file column type/target/skip overrides derived from type resolutions. */
export interface PerFileOverrides {
  columnTypes: Record<string, UePropertyType>;
  targets: Record<string, string>;
  skipColumns: Set<string>;
}

/** Detect columns whose inferred type differs across at least two files. */
export function detectColumnTypeConflicts(files: MultiFileProfile[]): LocalDataTypeConflict[] {
  const columnMap = new Map<string, LocalDataTypeConflictSource[]>();
  for (const entry of files) {
    for (const column of entry.profile.columns) {
      const sources = columnMap.get(column.name) ?? [];
      sources.push({ file: entry.file, type: column.inferred_type, samples: column.samples ?? [] });
      columnMap.set(column.name, sources);
    }
  }

  const conflicts: LocalDataTypeConflict[] = [];
  for (const [column, sources] of columnMap) {
    if (sources.length < 2) continue;
    if (new Set(sources.map((source) => source.type)).size > 1) {
      conflicts.push({ column, sources });
    }
  }
  return conflicts;
}

/** Build a column union showing each column's inferred type per file. */
export function buildColumnUnion(files: MultiFileProfile[]): LocalDataColumnUnionEntry[] {
  const columnMap = new Map<string, Record<string, string>>();
  for (const entry of files) {
    for (const column of entry.profile.columns) {
      const perFileTypes = columnMap.get(column.name) ?? {};
      perFileTypes[entry.file] = column.inferred_type;
      columnMap.set(column.name, perFileTypes);
    }
  }

  const entries: LocalDataColumnUnionEntry[] = [];
  for (const [column, per_file_types] of columnMap) {
    const types = Object.values(per_file_types);
    entries.push({ column, per_file_types, has_conflict: new Set(types).size > 1 });
  }
  return entries;
}

export function validateTypeResolutions(value: unknown, fileKeys: string[]): asserts value is TypeResolutions {
  if (!isRecord(value)) {
    throw resolutionError('type-resolutions must be a JSON object mapping column names to resolutions.');
  }
  const knownFiles = new Set(fileKeys);
  for (const [column, resolution] of Object.entries(value)) {
    if (!column.trim()) throw resolutionError('type-resolutions keys must be non-empty column names.');
    if (!isRecord(resolution)) throw resolutionError('Each type resolution must be an object.');
    if (resolution.action === 'unify') {
      if (!isPropertyType(resolution.unifiedType)) {
        throw resolutionError('unify resolutions require a valid unifiedType (number, string, boolean, datetime, list, or object).');
      }
    } else if (resolution.action === 'split') {
      if (!isRecord(resolution.fileMappings) || Object.keys(resolution.fileMappings).length === 0) {
        throw resolutionError('split resolutions require a non-empty fileMappings object.');
      }
      for (const [file, mapping] of Object.entries(resolution.fileMappings)) {
        if (!knownFiles.has(file)) throw resolutionError('split resolutions reference an unknown file.');
        if (!isRecord(mapping)
          || typeof mapping.ae_name !== 'string'
          || !isValidAeName(mapping.ae_name)
          || !isPropertyType(mapping.type)) {
          throw resolutionError('split fileMappings entries require a legal ae_name and a valid type.');
        }
      }
    } else if (resolution.action === 'skip') {
      if (!isNonEmptyStringArray(resolution.skipFiles)
        || (resolution.skipFiles as string[]).some((file) => !knownFiles.has(file))) {
        throw resolutionError('skip resolutions require a non-empty skipFiles array of known files.');
      }
    } else {
      throw resolutionError('Resolution action must be unify, split, or skip.');
    }
  }
}

/** Compute per-file column type/target/skip overrides from resolutions. */
export function applyTypeResolutions(
  resolutions: TypeResolutions,
  files: MultiFileProfile[],
): Map<string, PerFileOverrides> {
  const contexts = new Map<string, PerFileOverrides>();
  for (const entry of files) {
    const columnTypes: Record<string, UePropertyType> = {};
    for (const column of entry.profile.columns) {
      columnTypes[column.name] = toPropertyType(column.inferred_type);
    }
    contexts.set(entry.file, { columnTypes, targets: {}, skipColumns: new Set() });
  }

  for (const [column, resolution] of Object.entries(resolutions) as Array<[string, TypeResolution]>) {
    if (resolution.action === 'unify' && resolution.unifiedType) {
      for (const context of contexts.values()) {
        context.columnTypes[column] = resolution.unifiedType;
      }
    } else if (resolution.action === 'skip' && resolution.skipFiles) {
      for (const file of resolution.skipFiles) {
        contexts.get(file)?.skipColumns.add(column);
      }
    } else if (resolution.action === 'split' && resolution.fileMappings) {
      for (const [file, mapping] of Object.entries(resolution.fileMappings)) {
        const context = contexts.get(file);
        if (!context) continue;
        context.columnTypes[column] = mapping.type;
        context.targets[column] = mapping.ae_name;
      }
    }
  }
  return contexts;
}

/** Stamp a file's real fingerprint/data set and merge resolution overrides into a per-file mapping. */
export function buildPerFileMapping(
  baseMapping: LocalDataMapping,
  profile: LocalDataProfile,
  overrides: PerFileOverrides,
): LocalDataMapping {
  const excludeColumns = new Set(baseMapping.exclude_columns ?? []);
  for (const column of overrides.skipColumns) excludeColumns.add(column);

  const properties = baseMapping.properties.map((property) => {
    const overrideType = overrides.columnTypes[property.source];
    const target = overrides.targets[property.source] ?? property.target;
    return {
      ...property,
      ...(overrideType !== undefined ? { type: overrideType } : {}),
      target,
    };
  });

  return {
    ...baseMapping,
    source: {
      sha256: profile.source.sha256,
      format: profile.source.format,
      data_set: profile.data_set.id,
    },
    properties,
    ...(excludeColumns.size > 0 ? { exclude_columns: [...excludeColumns] } : {}),
  };
}

function toPropertyType(inferredType: string): UePropertyType {
  return isPropertyType(inferredType) ? inferredType : 'string';
}

function isPropertyType(value: unknown): value is UePropertyType {
  return typeof value === 'string' && PROPERTY_TYPES.has(value);
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0
    && value.every((entry) => typeof entry === 'string' && entry.length > 0);
}

function resolutionError(message: string): CliValidationError {
  return new CliValidationError(message, {
    code: 'LOCAL_DATA_TYPE_RESOLUTIONS_INVALID',
    location: { field: 'type-resolutions' },
  });
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
