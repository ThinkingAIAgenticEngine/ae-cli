import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'delete_config_channel';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    channelId: ctx.str('channel_id'),
  };
}

export const deleteConfigChannel: Command = {
  service: 'engage',
  command: '+delete_config_channel',
  description: 'Delete a config channel.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel_id', type: 'string', required: true, desc: 'Config channel ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
