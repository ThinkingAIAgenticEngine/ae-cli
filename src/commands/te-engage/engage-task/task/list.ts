import { createEngageTaskCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';

/** Queries the task list. */
export const taskList = createEngageTaskCapabilityCommand({
  resource: 'task', command: 'list', capabilityId: 'engage-task.task.list', description: 'Query the paginated task list.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Task list request JSON object.' }],
  risk: 'read', validate: (ctx) => { readRequiredJsonObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredJsonObject(ctx, 'req') }),
});
