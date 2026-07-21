import {
  compactInput,
  createTrackingCapabilityCommand,
  dataTypeFlag,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  requestIdFlag,
  timeoutSecondsFlag,
} from '../shared.js';

export const trackingLiveDataList = createTrackingCapabilityCommand({
  resource: 'live-data',
  command: 'list',
  capabilityId: 'tracking.live_data.list',
  description: 'List recent tracking live data.',
  flags: [projectIdFlag, dataTypeFlag, requestIdFlag, timeoutSecondsFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), data_type: optionalString(ctx, 'data-type'), request_id: optionalString(ctx, 'request-id'), timeout_seconds: optionalNumber(ctx, 'timeout-seconds') }),
});
