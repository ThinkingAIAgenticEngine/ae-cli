import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getLivestreamAnalysis: Command = {
  service: 'community',
  command: 'get_livestream_analysis',
  description:
    'AI-generated live session analysis report: highlight moments (time slices with metrics and AI insights) and sentiment opinions.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'stream-id', type: 'string', required: true, desc: 'Live session ID (streamId) from get_livestream_list.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const streamId = ctx.str('stream-id');
    const host = ctx.host();

    const param = { gameId, streamId };
    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_livestream_analysis', args, host);
    return parseMcpResult(result);
  },
};
