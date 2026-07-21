import {
  compactInput,
  createTrackingCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  requestIdFlag,
  timeoutSecondsFlag,
  uuidFlag,
} from '../shared.js';

export const trackingCheckGet = createTrackingCapabilityCommand({
  resource: 'check',
  command: 'get',
  capabilityId: 'tracking.check.get',
  description: 'Get one tracking validation result.',
  flags: [projectIdFlag, uuidFlag, requestIdFlag, timeoutSecondsFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), uuid: ctx.str('uuid'), request_id: optionalString(ctx, 'request-id'), timeout_seconds: optionalNumber(ctx, 'timeout-seconds') }),
});
