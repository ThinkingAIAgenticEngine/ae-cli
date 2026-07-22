import { createEngageTaskCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';

/** Builds a task save guide. */
export const taskBuildSaveGuide = createEngageTaskCapabilityCommand({
  resource: 'task', command: 'build-save-guide', capabilityId: 'engage-task.task.build-save-guide',
  description: 'Build a scenario-specific task save guide.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Guide request JSON object; use {} for a generic guide.' }],
  risk: 'read', validate: (ctx) => { readRequiredJsonObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredJsonObject(ctx, 'req') }),
});
