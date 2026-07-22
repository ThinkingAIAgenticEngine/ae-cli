import { createEngageTaskCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';

/** Gets task status statistics. */
export const taskStats = createEngageTaskCapabilityCommand({
  resource: 'task', command: 'stats', capabilityId: 'engage-task.task.stats', description: 'Get task status statistics.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Task statistics request JSON object.' }],
  risk: 'read', validate: (ctx) => { readRequiredJsonObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredJsonObject(ctx, 'req') }),
});
