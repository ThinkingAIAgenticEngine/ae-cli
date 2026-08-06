import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  aiDefinitionFlag,
  aiModelTypeFlag,
  metadataResolutionsFlag,
} from '../ai-models.js';
import {
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
  clusterQueryScopeFlag,
  compactInput,
  fieldsFlag,
  optionalBoolean,
  optionalJson,
  optionalJsonArray,
  optionalNumber,
  optionalString,
  projectIdFlag,
  analysisModelPreviewRowsFlag,
  requestIdFlag,
  slaveClusterIdFlag,
} from '../capability-shared.js';

export const useCacheFlag: Flag = {
  name: 'use-cache',
  type: 'boolean',
  required: false,
  desc: 'Whether to use query cache. Default: true.',
};

export const zoneOffsetFlag: Flag = {
  name: 'zone-offset',
  type: 'number',
  required: false,
  desc: 'Optional timezone mode. Fixed UTC offsets are -12..14; 99 means stored local time without fixed UTC conversion (not UTC+99). Omit to use the project analysis default.',
};

export function adhocRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    model_type: ctx.str('model-type'),
    definition: ctx.json('definition'),
    resolutions: optionalJson(ctx, 'resolutions'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    fields: optionalJsonArray(ctx, 'fields'),
    cluster_query_scope: optionalString(ctx, 'cluster-query-scope'),
    slave_cluster_id: optionalString(ctx, 'slave-cluster-id'),
    preview_rows: optionalNumber(ctx, 'preview-rows'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function adhocExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    model_type: ctx.str('model-type'),
    definition: ctx.json('definition'),
    resolutions: optionalJson(ctx, 'resolutions'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    fields: optionalJsonArray(ctx, 'fields'),
    cluster_query_scope: optionalString(ctx, 'cluster-query-scope'),
    slave_cluster_id: optionalString(ctx, 'slave-cluster-id'),
    format: optionalString(ctx, 'artifact-format'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export const adhocBaseFlags = [
  projectIdFlag,
  aiModelTypeFlag(true),
  aiDefinitionFlag(true),
  metadataResolutionsFlag,
  requestIdFlag,
  useCacheFlag,
  zoneOffsetFlag,
  fieldsFlag,
  clusterQueryScopeFlag,
  slaveClusterIdFlag,
] as const;

export const adhocRunFlags = [
  ...adhocBaseFlags,
  analysisModelPreviewRowsFlag,
] as const;

export const adhocExportFlags = [
  ...adhocBaseFlags,
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;
