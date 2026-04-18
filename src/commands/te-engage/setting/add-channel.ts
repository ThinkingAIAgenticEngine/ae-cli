import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonObject } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'add_channel';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    req: {
      projectId: ctx.num('project-id'),
      ...readRequiredJsonObject(ctx, 'req'),
    },
  };
}

export const addChannel: Command = {
  service: 'te-engage',
  command: '+add-channel',
  description: 'Create a new engage channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'req', type: 'json', required: true, desc: 'Channel creation request as JSON object' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readRequiredJsonObject(ctx, 'req');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
