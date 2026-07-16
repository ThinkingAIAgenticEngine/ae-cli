import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Deletes one or more task groups. */
export const groupDelete = createEngageTaskCapabilityCommand({
  resource: 'group',
  command: 'delete',
  capabilityId: 'engage-task.group.delete',
  description: 'Delete one or more task groups.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'group-ids',
      type: 'json',
      required: true,
      desc: 'JSON array of task group IDs to delete, e.g. \'["1","2"]\'.',
    },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    group_ids: ctx.json('group-ids'),
  }),
});
