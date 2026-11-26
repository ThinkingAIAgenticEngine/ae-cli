import { CliValidationError } from '../../../core/errors.js';
import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  asyncTimeoutSecondsFlag,
  compactInput,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  optionalStringPreserveEmpty,
  projectIdFlag,
  previewRowsFlag,
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
  required: false,
  desc: 'Canonical user_id returned by analysis drilldown-entities run. Pass exactly one of --user-id or --account-id.',
};

const accountIdFlag: Flag = {
  name: 'account-id',
  type: 'string',
  required: false,
  sensitive: true,
  desc: 'Exact #account_id in the project, such as a PlayFab ID. Pass exactly one of --user-id or --account-id.',
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
  accountIdFlag,
  ...sequenceFlags,
  requestIdFlag,
  useCacheFlag,
] as const;

export const drilldownUserEventsRunFlags = [
  ...drilldownUserEventsBaseFlags,
  previewRowsFlag,
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
    preview_rows: optionalNumber(ctx, 'preview-rows'),
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
  const userId = optionalStringPreserveEmpty(ctx, 'user-id');
  const accountId = optionalStringPreserveEmpty(ctx, 'account-id');
  if (userId !== undefined && accountId !== undefined) {
    throw new CliValidationError('Pass only one of --user-id or --account-id.', { code: 'USER_IDENTITY_CONFLICT' });
  }
  if (accountId !== undefined && !accountId.trim()) {
    throw new CliValidationError('--account-id must not be blank.', { code: 'INVALID_ACCOUNT_ID' });
  }
  if (!userId?.trim() && accountId === undefined) {
    throw new CliValidationError('Pass one of --user-id or --account-id.', { code: 'USER_ID_REQUIRED' });
  }
  return {
    project_id: ctx.num('project-id'),
    drilldown_context_id: ctx.str('drilldown-context-id'),
    user_id: userId,
    account_id: accountId,
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
