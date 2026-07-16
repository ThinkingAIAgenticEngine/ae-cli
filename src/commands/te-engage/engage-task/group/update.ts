import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Renames a task group. */
export const groupUpdate = createEngageTaskCapabilityCommand({
  resource: 'group',
  command: 'update',
  capabilityId: 'engage-task.group.update',
  description: 'Rename a task group.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'group-id', type: 'number', required: true, desc: 'Task group ID.' },
    { name: 'group-name', type: 'string', required: true, desc: 'New task group name.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    group_id: ctx.num('group-id'),
    group_name: ctx.str('group-name'),
  }),
});
