import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  asyncTimeoutSecondsFlag,
  compactInput,
  detailPreviewLimitFlag,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  requestIdFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import { coordinateFlag, propertiesFlag, sourceFlag, useCacheFlag } from '../query/shared.js';

const queryContextIdFlag: Flag = {
  name: 'query-context-id',
  type: 'string',
  required: true,
  desc: 'query_context_id returned by a synchronous event-analysis preview. Analysis exports never create one.',
};

export const drilldownEventsRunFlags = [
  projectIdFlag,
  queryContextIdFlag,
  sourceFlag,
  coordinateFlag,
  propertiesFlag,
  requestIdFlag,
  useCacheFlag,
  detailPreviewLimitFlag,
  syncTimeoutSecondsFlag,
] as const;

const csvArtifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Artifact format. Only csv is supported; the downloaded artifact is csv.gz.',
};

export const drilldownEventsExportFlags = [
  projectIdFlag,
  queryContextIdFlag,
  sourceFlag,
  coordinateFlag,
  propertiesFlag,
  requestIdFlag,
  useCacheFlag,
  csvArtifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;

export function drilldownEventsRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    query_context_id: ctx.str('query-context-id'),
    source: optionalJson(ctx, 'source'),
    coordinate: ctx.json('coordinate'),
    properties: optionalJson(ctx, 'properties'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    limit: optionalNumber(ctx, 'limit'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function drilldownEventsExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    project_id: ctx.num('project-id'),
    query_context_id: ctx.str('query-context-id'),
    source: optionalJson(ctx, 'source'),
    coordinate: ctx.json('coordinate'),
    properties: optionalJson(ctx, 'properties'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    format: optionalString(ctx, 'artifact-format'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}
