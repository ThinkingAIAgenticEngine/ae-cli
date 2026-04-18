import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'update_channel_status';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    channelId: ctx.str('channel-id'),
    status: ctx.num('status'),
  };
}

export const updateChannelStatus: Command = {
  service: 'te-engage',
  command: '+update-channel-status',
  description: 'Update engage channel status.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID' },
    { name: 'status', type: 'number', required: true, desc: 'Channel status' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
