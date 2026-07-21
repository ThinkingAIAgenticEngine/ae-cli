import type { Flag, RuntimeContext } from '../../framework/types.js';
import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig as CoreCapabilityCommandConfig,
} from '../../core/capability-command.js';

type AnalysisCapabilityCommandConfig = Omit<CoreCapabilityCommandConfig, 'cliService' | 'gatewayDomain'>;

export const analysisDataRunRoutingHelp =
  'Routing: use run only for analysis data that fits <=1000 inline rows and <=180s; use export for full, unknown-size, >1000-row, or long-running data.';

export const analysisDataExportRoutingHelp =
  'Routing: use export for full, unknown-size, >1000-row, or long-running analysis data; inspect/download by run_id/artifact_id; use run only for <=1000-row inline previews.';

export function createAnalysisCapabilityCommand(config: AnalysisCapabilityCommandConfig) {
  return createCapabilityCommandCore({
    ...config,
    cliService: 'analysis',
  });
}

export function createAnalysisMetaCapabilityCommand(config: AnalysisCapabilityCommandConfig) {
  return createCapabilityCommandCore({
    ...config,
    cliService: 'analysis-meta',
    gatewayDomain: 'analysis',
  });
}

export function createAnalysisGovernanceCapabilityCommand(config: AnalysisCapabilityCommandConfig) {
  return createCapabilityCommandCore({
    ...config,
    cliService: 'analysis-governance',
    gatewayDomain: 'analysis',
  });
}

export const projectIdFlag: Flag = {
  name: 'project-id',
  type: 'number',
  required: true,
  desc: 'Numeric project ID.',
  alias: 'p',
};

export const queryFlag: Flag = {
  name: 'query',
  type: 'string',
  required: false,
  desc: 'Optional keyword filter.',
  alias: 'q',
};

export const fieldsFlag: Flag = {
  name: 'fields',
  type: 'json',
  required: false,
  desc: 'Optional result field projection JSON array.',
  alias: 'f',
};

export const limitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Optional inline result limit.',
  alias: 'l',
};

export const directoryLimitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Directory page size. Default: 50, max: 200. Values outside 1..200 are rejected.',
  alias: 'l',
  min: 1,
  max: 200,
};

export const memberLimitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Bounded member row limit. Default: 50, max: 200. Values outside 1..200 are rejected.',
  alias: 'l',
  min: 1,
  max: 200,
};

export const sqlTableUsageFlag: Flag = {
  name: 'usage',
  type: 'string',
  required: false,
  desc: 'Authorized table set: analysis (default) or tag_cluster. Use tag_cluster before creating SQL tags or clusters.',
};

export const reportListLimitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Report page size. Default: 50, max: 200. Values outside 1..200 are rejected.',
  alias: 'l',
  min: 1,
  max: 200,
};

export const reportModelTypesFlag: Flag = {
  name: 'model-types',
  type: 'json',
  required: false,
  desc: 'Optional semantic report model JSON array, for example ["event","sql","tag","revenue"].',
};

export const syncLimitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Maximum inline rows for sync query results. Default: 100, max: 1000. Use export for full data.',
  alias: 'l',
  min: 1,
  max: 1000,
};

export const detailPreviewLimitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  desc: 'Maximum first preview rows. Default: 100, max: 1000. This is not a pagination window; use export for more rows.',
  alias: 'l',
  min: 1,
  max: 1000,
};

export const offsetFlag: Flag = {
  name: 'offset',
  type: 'number',
  required: false,
  desc: 'Optional zero-based result offset.',
  alias: 'o',
};

export const payloadFlag: Flag = {
  name: 'payload',
  type: 'json',
  required: false,
  desc: 'Optional snake_case object for complex capability payload fields.',
};

export const requiredPayloadFlag: Flag = {
  ...payloadFlag,
  required: true,
  desc: 'Required snake_case capability payload. Read the dedicated command reference for its semantic shape; an empty object is not a generic valid payload.',
};

export const requestIdFlag: Flag = {
  name: 'request-id',
  type: 'string',
  required: false,
  desc: 'Optional caller-supplied cli_<32 lowercase hex> lifecycle ID. ae-cli generates and prints one before dispatch when omitted.',
};

export const timeoutSecondsFlag: Flag = {
  name: 'timeout-seconds',
  type: 'number',
  required: false,
  desc: 'Optional capability execution timeout in seconds.',
};

export const syncTimeoutSecondsFlag: Flag = {
  name: 'timeout-seconds',
  type: 'number',
  required: false,
  desc: 'Sync timeout seconds. Default: 120, max: 180.',
  min: 1,
  max: 180,
};

export const dashboardSyncTimeoutSecondsFlag: Flag = {
  ...syncTimeoutSecondsFlag,
  desc: 'Sync timeout seconds. Default: 180, max: 180.',
};

export const asyncTimeoutSecondsFlag: Flag = {
  name: 'timeout-seconds',
  type: 'number',
  required: false,
  desc: 'Async runtime in seconds. Default and max: 21600 (6 hours); cancel earlier with analysis query cancel --run-id <run_id>.',
  min: 1,
  max: 21600,
};

export const artifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Logical artifact format, usually jsonl or csv. This does not select compression; read format, compression, file_name, content_type, and content_encoding from the returned descriptor.',
};

export function projectInput(ctx: RuntimeContext): Record<string, unknown> {
  return { project_id: ctx.num('project-id') };
}

export function listInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  });
}

export function reportListInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...listInput(ctx),
    model_types: optionalJson(ctx, 'model-types'),
  });
}

export function dashboardReportDataInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    report_ids: optionalJsonArray(ctx, 'report-ids'),
    filters: optionalJson(ctx, 'filters'),
    start_time: optionalString(ctx, 'start-time'),
    end_time: optionalString(ctx, 'end-time'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    limit: optionalNumber(ctx, 'limit'),
    format: optionalString(ctx, 'artifact-format'),
  });
}

export function exportLifecycleInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    format: optionalString(ctx, 'artifact-format'),
  });
}

export function biPanelPageDataInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    panel_id: ctx.num('panel-id'),
    page_key: ctx.str('page-key'),
    result_type: ctx.str('result-type'),
    chart_ids: optionalJsonArray(ctx, 'chart-ids'),
    parameter_controls: optionalJson(ctx, 'parameter-controls'),
    permission_controls: optionalJson(ctx, 'permission-controls'),
    chart_filter_controls: optionalJson(ctx, 'chart-filter-controls'),
    columns: optionalJson(ctx, 'columns'),
    row_limit: optionalNumber(ctx, 'row-limit'),
    row_offset: optionalNumber(ctx, 'row-offset'),
    block_limit: optionalNumber(ctx, 'block-limit'),
    block_offset: optionalNumber(ctx, 'block-offset'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    limit: optionalNumber(ctx, 'limit'),
    format: optionalString(ctx, 'artifact-format'),
  });
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

export function stringWithDefault(ctx: RuntimeContext, name: string, defaultValue: string): string {
  const value = ctx.str(name);
  return value === '' ? defaultValue : value;
}

export function numberWithDefault(ctx: RuntimeContext, name: string, defaultValue: number): number {
  const value = ctx.str(name);
  return value === '' ? defaultValue : Number(value);
}

export function booleanWithDefault(ctx: RuntimeContext, name: string, defaultValue: boolean): boolean {
  const value = ctx.str(name);
  return value === '' ? defaultValue : ctx.bool(name);
}

export function optionalJson(ctx: RuntimeContext, name: string): unknown | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : ctx.json(name);
}

export function optionalJsonString(ctx: RuntimeContext, name: string): string | undefined {
  const value = optionalJson(ctx, name);
  return value === undefined ? undefined : JSON.stringify(value);
}

export function jsonArray(ctx: RuntimeContext, name: string): unknown[] {
  const value = ctx.json(name);
  return Array.isArray(value) ? value : [value];
}

export function optionalJsonArray(ctx: RuntimeContext, name: string): unknown[] | undefined {
  const value = ctx.str(name);
  if (value === '') {
    return undefined;
  }
  const parsed = ctx.json(name);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function compactInput(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function applyAnalysisInlineLimit(result: unknown, input: Record<string, unknown>): unknown {
  const limit = typeof input.limit === 'number' && Number.isInteger(input.limit) && input.limit > 0
    ? input.limit
    : undefined;
  if (!limit) {
    return result;
  }

  const cloned = cloneJsonLike(result);
  const summary = {
    truncated: false,
    containers: 0,
    originalRows: 0,
    returnedRows: 0,
  };
  trimRows(cloned, limit, summary);

  if (summary.truncated && cloned && typeof cloned === 'object' && !Array.isArray(cloned)) {
    (cloned as Record<string, unknown>)._cli_inline_limit = {
      requested_limit: limit,
      containers_truncated: summary.containers,
      original_rows: summary.originalRows,
      returned_rows: summary.returnedRows,
      note: 'Rows were truncated by ae-cli to keep sync run output within the inline limit. Use export for full data.',
    };
  }

  return cloned;
}

function cloneJsonLike(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function trimRows(
  value: unknown,
  limit: number,
  summary: { truncated: boolean; containers: number; originalRows: number; returnedRows: number },
): void {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) trimRows(item, limit, summary);
    return;
  }

  const record = value as Record<string, unknown>;
  const rows = record.rows;
  if (Array.isArray(rows) && rows.length > limit) {
    record.rows = rows.slice(0, limit);
    record._cli_truncation = {
      field: 'rows',
      requested_limit: limit,
      original_row_count: rows.length,
      returned_row_count: limit,
    };
    summary.truncated = true;
    summary.containers += 1;
    summary.originalRows += rows.length;
    summary.returnedRows += limit;
  }

  for (const child of Object.values(record)) {
    trimRows(child, limit, summary);
  }
}
