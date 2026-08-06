import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  asyncTimeoutSecondsFlag,
  compactInput,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  previewRowsFlag,
  requestIdFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import { coordinateFlag, propertiesFlag, sourceFlag, useCacheFlag } from '../query/shared.js';

const queryContextIdFlag: Flag = {
  name: 'query-context-id',
  type: 'string',
  required: true,
  desc: 'query_context_id returned by a synchronous analysis preview. Analysis exports never create one.',
};

const csvArtifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Artifact format. Only csv is supported; the downloaded artifact is csv.gz.',
};

export const drilldownEntitiesBaseFlags = [
  projectIdFlag,
  queryContextIdFlag,
  sourceFlag,
  coordinateFlag,
  propertiesFlag,
  requestIdFlag,
  useCacheFlag,
] as const;

export const drilldownEntitiesRunFlags = [
  ...drilldownEntitiesBaseFlags,
  previewRowsFlag,
  syncTimeoutSecondsFlag,
] as const;

export const drilldownEntitiesExportFlags = [
  ...drilldownEntitiesBaseFlags,
  csvArtifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;

export function drilldownEntitiesRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...baseInput(ctx),
    preview_rows: optionalNumber(ctx, 'preview-rows'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function drilldownEntitiesExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...baseInput(ctx),
    format: optionalString(ctx, 'artifact-format'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

function baseInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    query_context_id: ctx.str('query-context-id'),
    source: optionalJson(ctx, 'source'),
    coordinate: ctx.json('coordinate'),
    properties: optionalJson(ctx, 'properties'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
  };
}
