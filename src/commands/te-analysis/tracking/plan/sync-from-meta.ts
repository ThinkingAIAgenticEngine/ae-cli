import {
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingPlanSyncFromMeta = createTrackingCapabilityCommand({
  resource: 'plan',
  command: 'sync-from-meta',
  capabilityId: 'tracking.plan.sync_from_meta',
  description: 'Synchronize tracking plan from project metadata.',
  flags: [projectIdFlag],
  risk: 'write',
  buildInput: projectInput,
});
