import {
  asyncTimeoutSecondsFlag,
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectLifecycleInput,
  requestIdFlag,
} from '../shared.js';

export const trackingPlanExport = createTrackingCapabilityCommand({
  resource: 'plan',
  command: 'export',
  capabilityId: 'tracking.plan.export',
  asyncArtifact: true,
  description: 'Export the tracking plan as an artifact.',
  flags: [projectIdFlag, requestIdFlag, asyncTimeoutSecondsFlag],
  risk: 'read',
  buildInput: projectLifecycleInput,
});
