import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  artifactFormatFlag,
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

export function eventDetailRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    definition: ctx.json('definition'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    limit: optionalNumber(ctx, 'limit'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function eventDetailExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    definition: ctx.json('definition'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    format: optionalString(ctx, 'artifact-format'),
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
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;
