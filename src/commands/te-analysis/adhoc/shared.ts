import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  aiDefinitionFlag,
  aiModelTypeFlag,
} from '../ai-models.js';
import {
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
  compactInput,
  fieldsFlag,
  optionalBoolean,
  optionalJsonArray,
  optionalNumber,
  optionalString,
  projectIdFlag,
  requestIdFlag,
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
  desc: 'Optional timezone offset. UTC+8 is 8; UTC-5 is -5.',
};

export function adhocRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    model_type: ctx.str('model-type'),
    definition: ctx.json('definition'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    fields: optionalJsonArray(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function adhocExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    model_type: ctx.str('model-type'),
    definition: ctx.json('definition'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    zone_offset: optionalNumber(ctx, 'zone-offset'),
    fields: optionalJsonArray(ctx, 'fields'),
    format: optionalString(ctx, 'artifact-format'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export const adhocBaseFlags = [
  projectIdFlag,
  aiModelTypeFlag(true),
  aiDefinitionFlag(true),
  requestIdFlag,
  useCacheFlag,
  zoneOffsetFlag,
  fieldsFlag,
] as const;

export const adhocExportFlags = [
  ...adhocBaseFlags,
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;
