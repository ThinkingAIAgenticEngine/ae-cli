import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'update_config_channel_status';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    channelId: ctx.str('channel-id'),
    channelStatus: ctx.num('channel-status'),
  };
}

export const updateConfigChannelStatus: Command = {
  service: 'te-engage',
  command: '+update-config-channel-status',
  description: 'Update config channel status.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Config channel ID' },
    { name: 'channel-status', type: 'number', required: true, desc: 'Config channel status' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
