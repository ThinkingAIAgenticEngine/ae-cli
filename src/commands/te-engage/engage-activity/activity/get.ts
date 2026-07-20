import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Gets an operation activity detail. */
export const activityGet = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'get',
  capabilityId: 'engage-activity.activity.get',
  description: 'Get an operation activity detail (status, period, approval, topic/task counts).',
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
