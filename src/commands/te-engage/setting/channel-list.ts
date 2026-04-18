import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalNumber } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'query_channel_list';

function buildArgs(ctx: any): Record<string, any> {
  const args: Record<string, any> = { projectId: ctx.num('project-id') };
  const providerList = readOptionalJsonArray(ctx, 'provider-list');
  if (providerList !== undefined) args.providerList = providerList;
  const channelStatus = readOptionalNumber(ctx, 'channel-status');
  if (channelStatus !== undefined) args.channelStatus = channelStatus;
  return args;
}

export const channelList: Command = {
  service: 'te-engage',
  command: '+channel-list',
  description: 'List engage channels via MCP query_channel_list.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'provider-list', type: 'json', required: false, desc: 'Provider list as JSON array' },
    { name: 'channel-status', type: 'number', required: false, desc: 'Channel status filter' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
