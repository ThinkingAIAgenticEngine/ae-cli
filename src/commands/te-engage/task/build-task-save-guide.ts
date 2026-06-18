import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonObject } from '../utils.js';

const serviceName = 'engage_task';
const toolName = 'build_task_save_guide';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    req: readRequiredJsonObject(ctx, 'req'),
  };
}

export const buildTaskSaveGuide: Command = {
  service: 'engage',
  command: '+build_task_save_guide',
  description: 'Build a scenario-specific guide for constructing save_task req.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'req', type: 'json', required: true, desc: 'Guide request as JSON object; use {} for a generic guide' },
  ],
  risk: 'read',
  validate: (ctx) => {
    readRequiredJsonObject(ctx, 'req');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
