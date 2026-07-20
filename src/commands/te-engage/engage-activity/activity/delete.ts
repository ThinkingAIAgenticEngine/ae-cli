import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Deletes an operation activity (draft/denied/ended only). */
export const activityDelete = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'delete',
  capabilityId: 'engage-activity.activity.delete',
  description: 'Delete an operation activity (draft/denied/ended only).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
  }),
});
