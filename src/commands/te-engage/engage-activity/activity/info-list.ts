import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Queries an activity's topics and standalone tasks structure. */
export const activityInfoList = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'info-list',
  capabilityId: 'engage-activity.activity.info-list',
  description: "Query an activity's topics and standalone tasks structure.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'activity-id', type: 'string', required: true, desc: 'Activity ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    activity_id: ctx.str('activity-id'),
  }),
});
