import {
  commonEventPropNamesFlag,
  compactInput,
  confirmFlag,
  createTrackingCapabilityCommand,
  eventPropNamesFlag,
  eventsFlag,
  optionalJson,
  projectIdFlag,
  projectInput,
  userPropNamesFlag,
} from '../shared.js';

export const trackingPlanDeleteItems = createTrackingCapabilityCommand({
  resource: 'plan',
  command: 'delete-items',
  capabilityId: 'tracking.plan.delete_items',
  description: 'Delete tracking plan items.',
  flags: [projectIdFlag, eventsFlag, eventPropNamesFlag, userPropNamesFlag, commonEventPropNamesFlag, confirmFlag],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    events: optionalJson(ctx, 'events'),
    event_prop_names: optionalJson(ctx, 'event-prop-names'),
    user_prop_names: optionalJson(ctx, 'user-prop-names'),
    common_event_prop_names: optionalJson(ctx, 'common-event-prop-names'),
    yes: ctx.bool('confirm'),
  }),
});
