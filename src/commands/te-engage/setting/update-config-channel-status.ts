import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'update_config_channel_status';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    channelId: ctx.str('channel_id'),
    channelStatus: ctx.num('channel_status'),
  };
}

export const updateConfigChannelStatus: Command = {
  service: 'engage',
  command: '+update_config_channel_status',
  description: 'Update config channel status.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel_id', type: 'string', required: true, desc: 'Config channel ID' },
    { name: 'channel_status', type: 'number', required: true, desc: 'Config channel status' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
