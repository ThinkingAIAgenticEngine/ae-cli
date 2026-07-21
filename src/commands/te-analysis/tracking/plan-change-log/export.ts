import {
  asyncTimeoutSecondsFlag,
  compactInput,
  createTrackingCapabilityCommand,
  logIdFlag,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  requestIdFlag,
} from '../shared.js';

export const trackingPlanChangeLogExport = createTrackingCapabilityCommand({
  resource: 'plan-change-log',
  command: 'export',
  capabilityId: 'tracking.plan_change_log.export',
  description: 'Export one tracking plan change log.',
  flags: [projectIdFlag, logIdFlag, requestIdFlag, asyncTimeoutSecondsFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...projectInput(ctx), log_id: ctx.num('log-id'), request_id: optionalString(ctx, 'request-id'), timeout_seconds: optionalNumber(ctx, 'timeout-seconds') }),
});
