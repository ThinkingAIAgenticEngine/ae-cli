import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonObject } from '../utils.js';

const serviceName = 'engage_task';
const toolName = 'get_task_stats';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    req: {
      projectId: ctx.num('project_id'),
      ...readRequiredJsonObject(ctx, 'req'),
    },
  };
}

export const taskStats: Command = {
  service: 'engage',
  command: '+task_stats',
  description: 'Get status statistics for tasks.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'req', type: 'json', required: true, desc: 'Task stats request as JSON object' },
  ],
  risk: 'read',
  validate: (ctx) => {
    readRequiredJsonObject(ctx, 'req');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
