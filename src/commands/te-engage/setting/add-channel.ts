import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonObject } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'add_channel';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    req: {
      projectId: ctx.num('project_id'),
      ...readRequiredJsonObject(ctx, 'req'),
    },
  };
}

export const addChannel: Command = {
  service: 'engage',
  command: '+add_channel',
  description: 'Create a new engage channel.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'req', type: 'json', required: true, desc: 'Channel creation request as JSON object' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readRequiredJsonObject(ctx, 'req');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
