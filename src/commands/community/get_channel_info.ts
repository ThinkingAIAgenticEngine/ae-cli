import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getChannelInfo: Command = {
  service: 'community',
  command: 'get_channel_info',
  description: 'Valid channel list for a community space (channel id and name).',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const host = ctx.host();

    const param = { gameId };

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_analysis');
    const result = await callMcpTool(mcpUrl, 'get_channel_info', args, host);
    return parseMcpResult(result);
  },
};
