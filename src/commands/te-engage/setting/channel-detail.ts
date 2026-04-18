import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'query_channel_detail';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    channelId: ctx.str('channel-id'),
  };
}

export const channelDetail: Command = {
  service: 'te-engage',
  command: '+channel-detail',
  description: 'Get engage channel detail via MCP query_channel_detail.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
