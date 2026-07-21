import {
  asyncTimeoutSecondsFlag,
  compactInput,
  createTrackingCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  requestIdFlag,
  uuidFlag,
} from '../shared.js';

export const trackingCheckExport = createTrackingCapabilityCommand({
  resource: 'check',
  command: 'export',
  capabilityId: 'tracking.check.export',
  description: 'Export one tracking validation result.',
  flags: [projectIdFlag, uuidFlag, requestIdFlag, asyncTimeoutSecondsFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), uuid: ctx.str('uuid'), request_id: optionalString(ctx, 'request-id'), timeout_seconds: optionalNumber(ctx, 'timeout-seconds') }),
});
