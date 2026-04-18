import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalNumber } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'query_config_channel_list';

function buildArgs(ctx: any): Record<string, any> {
  const args: Record<string, any> = { projectId: ctx.num('project-id') };
  const channelType = readOptionalNumber(ctx, 'channel-type');
  if (channelType !== undefined) args.channelType = channelType;
  return args;
}

export const configChannelList: Command = {
  service: 'te-engage',
  command: '+config-channel-list',
  description: 'List config channels.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel-type', type: 'number', required: false, desc: 'Config channel type' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
