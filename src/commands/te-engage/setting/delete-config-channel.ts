import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'delete_config_channel';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    channelId: ctx.str('channel-id'),
  };
}

export const deleteConfigChannel: Command = {
  service: 'te-engage',
  command: '+delete-config-channel',
  description: 'Delete a config channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Config channel ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
