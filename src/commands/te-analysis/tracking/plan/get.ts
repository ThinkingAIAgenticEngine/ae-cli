import {
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingPlanGet = createTrackingCapabilityCommand({
  resource: 'plan',
  command: 'get',
  capabilityId: 'tracking.plan.get',
  description: 'Get the tracking plan for one project.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
