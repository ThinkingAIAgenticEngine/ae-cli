import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Updates an operation activity from an ActivityDTO payload. */
export const activityUpdate = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'update',
  capabilityId: 'engage-activity.activity.update',
  description: 'Update an operation activity from an ActivityDTO payload (activityId + base fields).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'payload', type: 'json', required: true, desc: 'ActivityDTO JSON body (activityId + ActivityAddDTO fields).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
