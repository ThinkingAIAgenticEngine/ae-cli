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
import { propertiesFlag, useCacheFlag } from '../query/shared.js';

const drilldownContextIdFlag: Flag = {
  name: 'drilldown-context-id',
  type: 'string',
  required: true,
  desc: 'drilldown_context_id returned by analysis drilldown-entities run for the user subject. Custom entities have no user event sequence.',
};

const userIdFlag: Flag = {
  name: 'user-id',
  type: 'string',
  required: true,
  desc: 'Canonical user_id returned by analysis drilldown-entities run. Never guess or substitute another identity field.',
};

const sequenceFlags: Flag[] = [
  propertiesFlag,
  { name: 'sort-order', type: 'string', required: false, desc: 'Event time sort order: asc or desc.' },
  { name: 'event-name-filter', type: 'string', required: false, desc: 'Optional event-name filter.' },
  { name: 'time-filter', type: 'string', required: false, desc: 'Optional time filter condition.' },
  { name: 'time-filter-before-nums', type: 'number', required: false, desc: 'Optional events before the time filter point.' },
  { name: 'time-filter-after-nums', type: 'number', required: false, desc: 'Optional events after the time filter point.' },
];

const csvArtifactFormatFlag: Flag = {
  name: 'artifact-format',
  type: 'string',
  required: false,
  desc: 'Artifact format. Only csv is supported; the downloaded artifact is csv.gz.',
};

export const drilldownUserEventsBaseFlags = [
  projectIdFlag,
  drilldownContextIdFlag,
  userIdFlag,
  ...sequenceFlags,
  requestIdFlag,
  useCacheFlag,
] as const;

export const drilldownUserEventsRunFlags = [
  ...drilldownUserEventsBaseFlags,
  detailPreviewLimitFlag,
  syncTimeoutSecondsFlag,
] as const;

export const drilldownUserEventsExportFlags = [
  ...drilldownUserEventsBaseFlags,
  csvArtifactFormatFlag,
  asyncTimeoutSecondsFlag,
] as const;

export function drilldownUserEventsRunInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...baseInput(ctx),
    limit: optionalNumber(ctx, 'limit'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

export function drilldownUserEventsExportInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...baseInput(ctx),
    format: optionalString(ctx, 'artifact-format'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}

function baseInput(ctx: RuntimeContext): Record<string, unknown> {
  return {
    project_id: ctx.num('project-id'),
    drilldown_context_id: ctx.str('drilldown-context-id'),
    user_id: ctx.str('user-id'),
    properties: optionalJson(ctx, 'properties'),
    sort_order: optionalString(ctx, 'sort-order'),
    event_name_filter: optionalString(ctx, 'event-name-filter'),
    time_filter: optionalString(ctx, 'time-filter'),
    time_filter_before_nums: optionalNumber(ctx, 'time-filter-before-nums'),
    time_filter_after_nums: optionalNumber(ctx, 'time-filter-after-nums'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
  };
}
