import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Creates an operation activity (draft) from an ActivityAddDTO payload. */
export const activityCreate = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'create',
  capabilityId: 'engage-activity.activity.create',
  description: 'Create an operation activity (draft) from an ActivityAddDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ActivityAddDTO JSON body (activityName, activityType, tzOffset, periodType, periodStart, periodEnd, activityDesc).',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
