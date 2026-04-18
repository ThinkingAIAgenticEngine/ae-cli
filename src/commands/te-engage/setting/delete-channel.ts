import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'delete_channel';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    channelId: ctx.str('channel-id'),
  };
}

export const deleteChannel: Command = {
  service: 'te-engage',
  command: '+delete-channel',
  description: 'Delete an engage channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
