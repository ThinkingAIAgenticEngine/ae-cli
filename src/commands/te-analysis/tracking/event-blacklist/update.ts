import {
  blacklistTypeFlag,
  createTrackingCapabilityCommand,
  eventNamesFlag,
  projectIdFlag,
  projectInput,
} from '../shared.js';

export const trackingEventBlacklistUpdate = createTrackingCapabilityCommand({
  resource: 'event-blacklist',
  command: 'update',
  capabilityId: 'tracking.event_blacklist.update',
  description: 'Update tracking event blacklist config.',
  flags: [projectIdFlag, eventNamesFlag, blacklistTypeFlag],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), event_names: ctx.json('event-names'), type: ctx.num('type') }),
});
