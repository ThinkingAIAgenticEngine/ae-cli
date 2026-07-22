import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Gets one task. */
export const taskGet = createEngageTaskCapabilityCommand({
  resource: 'task', command: 'get', capabilityId: 'engage-task.task.get', description: 'Get one engagement task.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' }],
  risk: 'read', buildInput: (ctx) => ({ project_id: ctx.num('project-id'), task_id: ctx.str('task-id') }),
});
