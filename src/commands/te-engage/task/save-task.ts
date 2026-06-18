import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonObject } from '../utils.js';

const serviceName = 'engage_task';
const toolName = 'save_task';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    req: {
      projectId: ctx.num('project_id'),
      ...readRequiredJsonObject(ctx, 'req'),
    },
  };
}

export const saveTask: Command = {
  service: 'engage',
  command: '+save_task',
  description: 'Create or update a task draft.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'req', type: 'json', required: true, desc: 'Task save request as JSON object' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readRequiredJsonObject(ctx, 'req');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
