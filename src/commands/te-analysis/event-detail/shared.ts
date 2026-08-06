import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  asyncTimeoutSecondsFlag,
  compactInput,
  optionalBoolean,
  optionalNumber,
  optionalString,
  projectIdFlag,
  requestIdFlag,
} from '../capability-shared.js';
import {
  useCacheFlag,
  zoneOffsetFlag,
} from '../adhoc/shared.js';

export const eventDetailDefinitionFlag: Flag = {
  name: 'definition',
  type: 'json',
  required: true,
  desc: 'AI-facing event detail definition: {"event":"login","time_range":{"mode":"absolute","start_time":"2026-07-01 00:00:00","end_time":"2026-07-01 23:59:59"},"filters":{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]},"properties":["#event_time",{"name":"country","type":"user_property"}],"sort":[{"field":"#event_time","order":"desc"}]}. Do not pass raw QP/eventView/taFilters.',
};

const eventDetailArtifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Native streaming artifact format: jsonl or csv. Default: jsonl.',
};

export function eventDetailRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    definition: ctx.json('definition'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    preview_rows: optionalNumber(ctx, 'preview-rows'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function eventDetailExportInput(ctx: RuntimeContext): Record<string, unknown> {
  const format = optionalString(ctx, 'artifact-format');
  if (format !== undefined && format !== 'jsonl' && format !== 'csv') {
    throw new Error('--artifact-format only supports jsonl or csv for event detail export');
  }
  return compactInput({
    project_id: ctx.num('project-id'),
    definition: ctx.json('definition'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    format,
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export const eventDetailBaseFlags = [
  projectIdFlag,
  eventDetailDefinitionFlag,
  requestIdFlag,
  useCacheFlag,
  zoneOffsetFlag,
] as const;

export const eventDetailExportFlags = [
  ...eventDetailBaseFlags,
  eventDetailArtifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;
