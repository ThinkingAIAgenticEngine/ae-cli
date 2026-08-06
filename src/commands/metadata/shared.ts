import type { RuntimeContext } from '../../framework/types.js';
import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig as CoreCapabilityCommandConfig,
} from '../../core/capability-command.js';
import { withAsyncArtifactLifecycle } from '../../core/analysis-async-artifact.js';

type MetadataCapabilityCommandConfig = Omit<CoreCapabilityCommandConfig, 'cliService'> & {
  cliService?: string;
  asyncArtifact?: boolean;
};

export function createCapabilityCommand(config: MetadataCapabilityCommandConfig) {
  const { asyncArtifact, ...coreConfig } = config;
  const command = createCapabilityCommandCore({
    ...coreConfig,
    cliService: coreConfig.cliService ?? 'metadata',
  });
  return asyncArtifact ? withAsyncArtifactLifecycle(command) : command;
}

export function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

export function optionalNumber(ctx: RuntimeContext, name: string): number | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : Number(value);
}

export function optionalBoolean(ctx: RuntimeContext, name: string): boolean | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : ctx.bool(name);
}

export function optionalJson(ctx: RuntimeContext, name: string): unknown | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : ctx.json(name);
}

type DataTableColumnKind = 'csv' | 'sql';

export function optionalDataTableColumns(
  ctx: RuntimeContext,
  name: string,
  kind: DataTableColumnKind,
): unknown | undefined {
  const value = optionalJson(ctx, name);
  return value === undefined ? undefined : normalizeDataTableColumns(value, kind);
}

export function requiredDataTableColumns(ctx: RuntimeContext, name: string, kind: DataTableColumnKind): unknown {
  return normalizeDataTableColumns(ctx.json(name), kind);
}

function normalizeDataTableColumns(value: unknown, kind: DataTableColumnKind): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      return item;
    }

    const column = { ...(item as Record<string, unknown>) };
    if (column.column_name === undefined && column.name !== undefined) {
      column.column_name = column.name;
    }
    if (column.column_desc === undefined) {
      column.column_desc = column.display_name ?? column.description;
    }

    if (kind === 'csv') {
      if (column.select_type === undefined && column.type !== undefined) {
        column.select_type = column.type;
      }
    } else if (column.column_type === undefined && column.type !== undefined) {
      column.column_type = column.type;
    }

    delete column.name;
    delete column.type;
    delete column.display_name;
    delete column.description;
    return column;
  });
}
