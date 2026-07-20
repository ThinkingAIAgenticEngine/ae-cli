import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Ends an operation activity lifecycle. */
export const activityEnd = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'end',
  capabilityId: 'engage-activity.activity.end',
  description: 'End an operation activity lifecycle.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID to end.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
  }),
});
