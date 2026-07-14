import type { Flag, RuntimeContext } from '../../framework/types.js';
import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig as CoreCapabilityCommandConfig,
} from '../../core/capability-command.js';

type AnalysisCapabilityCommandConfig = Omit<CoreCapabilityCommandConfig, 'cliService' | 'gatewayDomain'>;

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

export function dashboardReportDataInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    report_ids: optionalJsonArray(ctx, 'report-ids'),
    filters: optionalJson(ctx, 'filters'),
    start_time: optionalString(ctx, 'start-time'),
    end_time: optionalString(ctx, 'end-time'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
    limit: optionalNumber(ctx, 'limit'),
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
