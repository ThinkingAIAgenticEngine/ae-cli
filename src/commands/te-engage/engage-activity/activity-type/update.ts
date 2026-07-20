import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Modifies a custom activity type name. */
export const activityTypeUpdate = createEngageActivityCapabilityCommand({
  resource: 'activity-type',
  command: 'update',
  capabilityId: 'engage-activity.activity-type.update',
  description: 'Modify a custom activity type name.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'id', type: 'string', required: true, desc: 'Activity type ID to modify.' },
    { name: 'type-name', type: 'string', required: true, desc: 'New activity type name (<=80 chars).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    id: ctx.str('id'),
    type_name: ctx.str('type-name'),
  }),
});
