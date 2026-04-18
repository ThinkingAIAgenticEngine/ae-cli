import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalNumber } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'query_config_channel_list';

function buildArgs(ctx: any): Record<string, any> {
  const args: Record<string, any> = { projectId: ctx.num('project_id') };
  const channelType = readOptionalNumber(ctx, 'channel_type');
  if (channelType !== undefined) args.channelType = channelType;
  return args;
}

export const configChannelList: Command = {
  service: 'engage',
  command: '+config_channel_list',
  description: 'List config channels.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel_type', type: 'number', required: false, desc: 'Config channel type' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
