import {
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingPlanChangeLogList = createTrackingCapabilityCommand({
  resource: 'plan-change-log',
  command: 'list',
  capabilityId: 'tracking.plan_change_log.list',
  description: 'List tracking plan change logs.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
