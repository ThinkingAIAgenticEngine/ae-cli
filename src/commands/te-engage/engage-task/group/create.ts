import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Creates a task group. */
export const groupCreate = createEngageTaskCapabilityCommand({
  resource: 'group',
  command: 'create',
  capabilityId: 'engage-task.group.create',
  description: 'Create a task group.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'group-name', type: 'string', required: true, desc: 'Task group name.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    group_name: ctx.str('group-name'),
  }),
});
