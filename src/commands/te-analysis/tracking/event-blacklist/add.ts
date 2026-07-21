import {
  createTrackingCapabilityCommand,
  eventNamesFlag,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingEventBlacklistAdd = createTrackingCapabilityCommand({
  resource: 'event-blacklist',
  command: 'add',
  capabilityId: 'tracking.event_blacklist.add',
  description: 'Add events to tracking event blacklist.',
  flags: [projectIdFlag, eventNamesFlag],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), event_names: ctx.json('event-names') }),
});
