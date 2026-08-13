import type { Flag, RuntimeContext } from '../../framework/types.js';
import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig as CoreCapabilityCommandConfig,
} from '../../core/capability-command.js';
import {
  withAsyncArtifactLifecycle,
  type AsyncArtifactLifecycleOptions,
} from '../../core/analysis-async-artifact.js';

type AnalysisCapabilityCommandConfig = Omit<CoreCapabilityCommandConfig, 'cliService' | 'gatewayDomain'> & {
  /** Explicitly opt this command into the shared run/artifact wait and download lifecycle. */
  asyncArtifact?: boolean | AsyncArtifactLifecycleOptions;
};

const ANALYSIS_GATEWAY_CLI_SERVICES = new Set(['project', 'system']);

export const analysisDataRunRoutingHelp =
  'Routing: --preview-rows bounds returned business rows per result; omit it to use the model current cluster-configured synchronous limit. Agents should normally pass --preview-rows 100. Use export for full, unknown-size, timed-out, or long-running data.';

export const analysisDataExportRoutingHelp =
  'Routing: use export for full, unknown-size, timed-out, or long-running analysis data. Plain export submits only; --wait waits, --output waits and atomically downloads, and analysis run wait resumes by run_id. Export commands do not accept --preview-rows.';

export function createAnalysisCapabilityCommand(config: AnalysisCapabilityCommandConfig) {
  const cliPath = resolveAnalysisGatewayCliPath(config);
  const { asyncArtifact, ...coreConfig } = config;
  const command = createCapabilityCommandCore({
    ...coreConfig,
    ...cliPath,
    gatewayDomain: 'analysis',
  });
  return asyncArtifact
    ? withAsyncArtifactLifecycle(command, typeof asyncArtifact === 'object' ? asyncArtifact : undefined)
    : command;
}

function resolveAnalysisGatewayCliPath(
  config: AnalysisCapabilityCommandConfig,
): Pick<CoreCapabilityCommandConfig, 'cliService' | 'resource' | 'command'> {
  const [capabilityService, capabilityResource, capabilityAction, ...extraSegments] =
    config.capabilityId.split('.');
  if (!ANALYSIS_GATEWAY_CLI_SERVICES.has(capabilityService)) {
    return {
      cliService: 'analysis',
      resource: config.resource,
      command: config.command,
    };
  }
  if (!capabilityResource || !capabilityAction || extraSegments.length > 0) {
    throw new Error(
      `Capability '${config.capabilityId}' must have exactly three segments for direct CLI registration.`,
    );
  }

  const resource = capabilityResource.replaceAll('_', '-');
  const command = capabilityAction.replaceAll('_', '-');
  const expectedLegacyResource = `${capabilityService} ${resource}`;
  if (config.resource !== expectedLegacyResource || config.command !== command) {
    throw new Error(
      `Capability '${config.capabilityId}' must map to ae-cli ${capabilityService} ${resource} ${command}.`,
    );
  }
  return { cliService: capabilityService, resource, command };
}

export function createAnalysisMetaCapabilityCommand(config: AnalysisCapabilityCommandConfig) {
  const { asyncArtifact, ...coreConfig } = config;
  const command = createCapabilityCommandCore({
    ...coreConfig,
    cliService: 'analysis-meta',
    gatewayDomain: 'analysis',
  });
  return asyncArtifact
    ? withAsyncArtifactLifecycle(command, typeof asyncArtifact === 'object' ? asyncArtifact : undefined)
    : command;
}

export function createAnalysisGovernanceCapabilityCommand(config: AnalysisCapabilityCommandConfig) {
  const { asyncArtifact, ...coreConfig } = config;
  const command = createCapabilityCommandCore({
    ...coreConfig,
    cliService: 'analysis-governance',
    gatewayDomain: 'analysis',
  });
  return asyncArtifact
    ? withAsyncArtifactLifecycle(command, typeof asyncArtifact === 'object' ? asyncArtifact : undefined)
    : command;
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

export const previewRowsFlag: Flag = {
  name: 'preview-rows',
  type: 'number',
  required: false,
  desc: 'Maximum business rows returned per result. Omit to use the current model/cluster synchronous limit. The runtime maximum varies by model; agents should normally pass 100.',
  min: 1,
};

export const analysisModelPreviewRowsFlag: Flag = {
  ...previewRowsFlag,
  desc: 'Maximum synchronous preview units returned per result. Units are business rows for tabular results. For path results, this limits real nodes per path level before overflow nodes are combined into more. Omit to use the current model/cluster synchronous limit. The runtime maximum varies by model; agents should normally pass 100.',
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

export const offsetFlag: Flag = {
  name: 'offset',
  type: 'number',
  required: false,
  desc: 'Optional zero-based result offset.',
  alias: 'o',
};

export const directoryOffsetFlag: Flag = {
  name: 'offset',
  type: 'number',
  required: false,
  desc: 'Zero-based directory page offset. Default: 0. Negative values are rejected.',
  alias: 'o',
  min: 0,
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

export const clusterQueryScopeFlag: Flag = {
  name: 'cluster-query-scope',
  type: 'string',
  required: false,
  desc: 'Optional physical query routing: GLOBAL aggregates accessible query clusters; SLAVE targets one --slave-cluster-id. Omit for the surface default.',
};

export const slaveClusterIdFlag: Flag = {
  name: 'slave-cluster-id',
  type: 'string',
  required: false,
  desc: 'Physical slave query-cluster ID from analysis query-cluster list. Required only with --cluster-query-scope SLAVE.',
};

export function validateClusterQueryRouting(ctx: RuntimeContext): void {
  const scope = optionalString(ctx, 'cluster-query-scope');
  const slaveClusterId = optionalString(ctx, 'slave-cluster-id');
  if (scope !== undefined && scope !== 'GLOBAL' && scope !== 'SLAVE') {
    throw new Error('--cluster-query-scope must be GLOBAL or SLAVE.');
  }
  if (scope === 'SLAVE' && slaveClusterId === undefined) {
    throw new Error('--slave-cluster-id is required with --cluster-query-scope SLAVE.');
  }
  if (scope !== 'SLAVE' && slaveClusterId !== undefined) {
    throw new Error('--slave-cluster-id is allowed only with --cluster-query-scope SLAVE.');
  }
}

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
    queries: optionalJson(ctx, 'queries'),
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
    cluster_query_scope: optionalString(ctx, 'cluster-query-scope'),
    slave_cluster_id: optionalString(ctx, 'slave-cluster-id'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    request_id: optionalString(ctx, 'request-id'),
    preview_rows: optionalNumber(ctx, 'preview-rows'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
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
    use_cache: optionalBoolean(ctx, 'use-cache'),
    request_id: optionalString(ctx, 'request-id'),
    preview_rows: optionalNumber(ctx, 'preview-rows'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
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
