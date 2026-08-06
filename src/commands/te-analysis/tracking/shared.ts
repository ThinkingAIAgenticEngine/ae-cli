import type { Flag, RuntimeContext } from '../../../framework/types.js';
import {
  createCapabilityCommand as createCapabilityCommandCore,
  type CreateCapabilityCommandConfig as CoreCapabilityCommandConfig,
} from '../../../core/capability-command.js';
import {
  asyncTimeoutSecondsFlag,
  compactInput,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  requestIdFlag,
  timeoutSecondsFlag,
} from '../capability-shared.js';
import { withAsyncArtifactLifecycle } from '../../../core/analysis-async-artifact.js';

type TrackingCapabilityCommandConfig = Omit<CoreCapabilityCommandConfig, 'cliService' | 'gatewayDomain'> & {
  asyncArtifact?: boolean;
};

export function createTrackingCapabilityCommand(config: TrackingCapabilityCommandConfig) {
  const { asyncArtifact, ...coreConfig } = config;
  const command = createCapabilityCommandCore({
    ...coreConfig,
    cliService: 'tracking',
    gatewayDomain: 'analysis',
  });
  return asyncArtifact ? withAsyncArtifactLifecycle(command) : command;
}

export { asyncTimeoutSecondsFlag, compactInput, optionalJson, optionalNumber, optionalString, projectIdFlag, requestIdFlag, timeoutSecondsFlag };

export const eventsFlag: Flag = {
  name: 'events',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of tracking events.',
};

export const eventPropsFlag: Flag = {
  name: 'event-props',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of tracking event properties.',
};

export const userPropsFlag: Flag = {
  name: 'user-props',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of tracking user properties.',
};

export const commonEventPropsFlag: Flag = {
  name: 'common-event-props',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of common tracking event properties.',
};

export const eventPropNamesFlag: Flag = {
  name: 'event-prop-names',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of event property names to delete.',
};

export const userPropNamesFlag: Flag = {
  name: 'user-prop-names',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of user property names to delete.',
};

export const commonEventPropNamesFlag: Flag = {
  name: 'common-event-prop-names',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of common event property names to delete.',
};

export const languageFlag: Flag = {
  name: 'language',
  type: 'string',
  required: true,
  desc: 'Generation language: zh-CN, en-US, ja-JP, or ko-KR.',
};

export const formDataFlag: Flag = {
  name: 'form-data',
  type: 'json',
  required: true,
  desc: 'Structured business context JSON object for tracking plan generation.',
};

export const developmentCarrierFlag: Flag = {
  name: 'development-carrier',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of development platforms.',
};

export const predefinedEventFlag: Flag = {
  name: 'predefined-event',
  type: 'json',
  required: false,
  desc: 'Optional JSON array of predefined event names.',
};

export const sdkTypesFlag: Flag = {
  name: 'sdk-types',
  type: 'json',
  required: true,
  desc: 'JSON array of SDK types to generate.',
};

export const checkScopeFlag: Flag = {
  name: 'check-scope',
  type: 'json',
  required: true,
  desc: 'Tracking check scope JSON object.',
};

export const resultScopeFlag: Flag = {
  name: 'result-scope',
  type: 'json',
  required: false,
  desc: 'Optional tracking check result scope JSON object.',
};

export const inputFileIdFlag: Flag = {
  name: 'input-file-id',
  type: 'string',
  required: true,
  desc: 'Gateway input file ID returned by input-file upload.',
};

export const langFlag: Flag = {
  name: 'lang',
  type: 'string',
  required: false,
  desc: 'Excel language: zh, en, ja, ko, zh_CN, en_US, ja_JP, or ko_KR.',
};

export const logIdFlag: Flag = {
  name: 'log-id',
  type: 'number',
  required: true,
  desc: 'Tracking plan change log ID.',
};

export const uuidFlag: Flag = {
  name: 'uuid',
  type: 'string',
  required: true,
  desc: 'Tracking check task UUID.',
};

export const startTimeFlag: Flag = {
  name: 'start-time',
  type: 'string',
  required: true,
  desc: 'Query start time.',
};

export const endTimeFlag: Flag = {
  name: 'end-time',
  type: 'string',
  required: true,
  desc: 'Query end time.',
};

export const dataNameFlag: Flag = {
  name: 'data-name',
  type: 'string',
  required: true,
  desc: 'Event or property name used to list ingest errors.',
};

export const dataTypeFlag: Flag = {
  name: 'data-type',
  type: 'string',
  required: false,
  desc: 'Live data type: normal (default) or error.',
};

export const debugDeviceIdFlag: Flag = {
  name: 'device-id',
  type: 'string',
  required: true,
  desc: 'Debug device ID reported by the SDK as #device_id.',
};

export const debugDeviceNameFlag: Flag = {
  name: 'device-name',
  type: 'string',
  required: true,
  desc: 'Human-readable name for the Debug device.',
};

export const eventNameFlag: Flag = {
  name: 'event-name',
  type: 'string',
  required: false,
  desc: 'Optional event name filter.',
};

export const eventNamesFlag: Flag = {
  name: 'event-names',
  type: 'json',
  required: true,
  desc: 'JSON array of event names.',
};

export const blacklistTypeFlag: Flag = {
  name: 'type',
  type: 'number',
  required: true,
  desc: 'Blacklist event config type: 0 or 1.',
};

export const confirmFlag: Flag = {
  name: 'confirm',
  type: 'boolean',
  required: true,
  desc: 'Must be true for this destructive tracking operation. Also use global --yes to skip local confirmation.',
};

export function projectInput(ctx: RuntimeContext): Record<string, unknown> {
  return { project_id: ctx.num('project-id') };
}

export function projectLifecycleInput(ctx: RuntimeContext): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  });
}
