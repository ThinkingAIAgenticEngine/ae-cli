import {
  asyncTimeoutSecondsFlag,
  compactInput,
  createTrackingCapabilityCommand,
  dataTypeFlag,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  requestIdFlag,
} from '../shared.js';

export const trackingLiveDataExport = createTrackingCapabilityCommand({
  resource: 'live-data',
  command: 'export',
  capabilityId: 'tracking.live_data.export',
  description: 'Export recent tracking live data.',
  flags: [projectIdFlag, dataTypeFlag, requestIdFlag, asyncTimeoutSecondsFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), data_type: optionalString(ctx, 'data-type'), request_id: optionalString(ctx, 'request-id'), timeout_seconds: optionalNumber(ctx, 'timeout-seconds') }),
});
