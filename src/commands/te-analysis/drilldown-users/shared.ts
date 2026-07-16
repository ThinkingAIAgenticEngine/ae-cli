import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  asyncTimeoutSecondsFlag,
  compactInput,
  detailPreviewLimitFlag,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  requestIdFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import { propertiesFlag, targetFlag, useCacheFlag } from '../query/shared.js';

const queryContextIdFlag: Flag = {
  name: 'query-context-id',
  type: 'string',
  required: true,
  desc: 'query_context_id returned by an analysis data run/export.',
};

const jsonlArtifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Artifact format. Only jsonl is supported.',
};

export const drilldownUsersBaseFlags = [
  queryContextIdFlag,
  targetFlag,
  propertiesFlag,
  requestIdFlag,
  useCacheFlag,
] as const;

export const drilldownUsersRunFlags = [
  ...drilldownUsersBaseFlags,
  detailPreviewLimitFlag,
  syncTimeoutSecondsFlag,
] as const;

export const drilldownUsersExportFlags = [
  ...drilldownUsersBaseFlags,
  jsonlArtifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;

export function drilldownUsersRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...baseInput(ctx),
    limit: optionalNumber(ctx, 'limit'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function drilldownUsersExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...baseInput(ctx),
    format: optionalString(ctx, 'artifact-format'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

function baseInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    query_context_id: ctx.str('query-context-id'),
    target: ctx.json('target'),
    properties: optionalJson(ctx, 'properties'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
  };
}
