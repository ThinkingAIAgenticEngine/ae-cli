import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Changes the group assignment of an engagement task. */
export const taskModifyGroup = createEngageTaskCapabilityCommand({
  resource: 'task',
  command: 'modify-group',
  capabilityId: 'engage-task.task.modify-group',
  description: 'Change the group assignment of an engagement task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
    {
      name: 'group-id',
      type: 'number',
      required: true,
      desc: 'Task group ID. Use 0 for the default group.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    group_id: ctx.num('group-id'),
  }),
});
