import {
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingCheckList = createTrackingCapabilityCommand({
  resource: 'check',
  command: 'list',
  capabilityId: 'tracking.check.list',
  description: 'List tracking validation runs.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
