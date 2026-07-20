import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Deletes an engagement task. */
export const taskDelete = createEngageTaskCapabilityCommand({
  resource: 'task',
  command: 'delete',
  capabilityId: 'engage-task.task.delete',
  description: 'Delete an engagement task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
  }),
});
