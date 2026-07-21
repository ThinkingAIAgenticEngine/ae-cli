import {
  commonEventPropsFlag,
  compactInput,
  createTrackingCapabilityCommand,
  eventPropsFlag,
  eventsFlag,
  optionalJson,
  projectIdFlag,
  projectInput,
  userPropsFlag,
} from '../shared.js';

export const trackingPlanSaveItems = createTrackingCapabilityCommand({
  resource: 'plan',
  command: 'save-items',
  capabilityId: 'tracking.plan.save_items',
  description: 'Save tracking plan items.',
  flags: [projectIdFlag, eventsFlag, eventPropsFlag, userPropsFlag, commonEventPropsFlag],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    events: optionalJson(ctx, 'events'),
    event_props: optionalJson(ctx, 'event-props'),
    user_props: optionalJson(ctx, 'user-props'),
    common_event_props: optionalJson(ctx, 'common-event-props'),
  }),
});
