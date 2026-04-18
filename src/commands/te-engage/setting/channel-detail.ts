import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'query_channel_detail';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    channelId: ctx.str('channel_id'),
  };
}

export const channelDetail: Command = {
  service: 'engage',
  command: '+channel_detail',
  description: 'Get engage channel detail via MCP query_channel_detail.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'channel_id', type: 'string', required: true, desc: 'Channel ID' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
