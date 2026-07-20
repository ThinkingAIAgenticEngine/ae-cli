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

export const entityDetailDefinitionFlag: Flag = {
  name: 'definition',
  type: 'json',
  required: true,
  desc: 'Bounded entity detail definition. properties is supported only for entity="user" (#user_id); user rows always include #user_id, #account_id, and #distinct_id plus requested user properties. Custom entities reject properties and return only their entity value column. cohort is AI-facing for user_property/tag/cluster filters; do not pass raw QP.',
};

export function entityDetailRunInput(ctx: RuntimeContext): Record<string, unknown> {
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

export function entityDetailExportInput(ctx: RuntimeContext): Record<string, unknown> {
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

export const entityDetailBaseFlags = [
  projectIdFlag,
  entityDetailDefinitionFlag,
  requestIdFlag,
  useCacheFlag,
  zoneOffsetFlag,
] as const;

export const entityDetailExportFlags = [
  ...entityDetailBaseFlags,
  artifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;
