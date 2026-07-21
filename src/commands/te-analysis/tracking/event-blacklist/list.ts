import {
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingEventBlacklistList = createTrackingCapabilityCommand({
  resource: 'event-blacklist',
  command: 'list',
  capabilityId: 'tracking.event_blacklist.list',
  description: 'List tracking event blacklist configuration.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
