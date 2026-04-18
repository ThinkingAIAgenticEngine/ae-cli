import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getCommentsSummary: Command = {
  service: 'community',
  command: 'get_comments_summary',
  description: 'Comment analytics summary for a post: sentiment mix and time trends. Aggregate stats only—no raw comment list.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'channel-id', type: 'number', required: true, desc: 'Channel ID from search_posts results.' },
    { name: 'uuid', type: 'string', required: true, desc: 'Content UUID from search_posts results.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Comment publish time lower bound; defaults to this post\'s publishTime from search_posts/get_post_detail.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Comment publish time upper bound. Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const channelId = ctx.num('channel-id');
    const uuid = ctx.str('uuid');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, channelId, uuid };

    const startTime = ctx.str('start-time');
    if (startTime) param.startTime = startTime;

    const endTime = ctx.str('end-time');
    if (endTime) param.endTime = endTime;

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_comments_summary', args, host);
    return parseMcpResult(result);
  },
};
