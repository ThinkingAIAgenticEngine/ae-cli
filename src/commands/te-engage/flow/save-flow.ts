import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonObject } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'save_flow';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    req: {
      projectId: ctx.num('project-id'),
      ...readRequiredJsonObject(ctx, 'req'),
    },
  };
}

export const saveFlow: Command = {
  service: 'te-engage',
  command: '+save-flow',
  description: 'Create or update a flow draft.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'req', type: 'json', required: true, desc: 'Flow save request as JSON object' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readRequiredJsonObject(ctx, 'req');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
