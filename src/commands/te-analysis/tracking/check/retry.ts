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

export const trackingCheckRetry = createTrackingCapabilityCommand({
  resource: 'check',
  command: 'retry',
  capabilityId: 'tracking.check.retry',
  description: 'Retry one tracking validation run.',
  flags: [projectIdFlag, uuidFlag, requestIdFlag, timeoutSecondsFlag],
  risk: 'write',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), uuid: ctx.str('uuid'), request_id: optionalString(ctx, 'request-id'), timeout_seconds: optionalNumber(ctx, 'timeout-seconds') }),
});
