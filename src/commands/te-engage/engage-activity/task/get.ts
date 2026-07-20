import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Gets a standalone task detail. */
export const taskGet = createEngageActivityCapabilityCommand({
  resource: 'task',
  command: 'get',
  capabilityId: 'engage-activity.task.get',
  description: 'Get a standalone task detail (config and status).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Task ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
  }),
});
