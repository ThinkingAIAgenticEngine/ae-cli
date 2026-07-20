import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Pauses an operation activity. */
export const activityPause = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'pause',
  capabilityId: 'engage-activity.activity.pause',
  description: 'Pause an operation activity to stop subsequent reach.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID to pause.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
  }),
});
