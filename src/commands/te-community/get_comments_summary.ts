import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getCommentsSummary: Command = {
  service: 'community',
  command: '+get_comments_summary',
  description: 'Comment analytics summary for a post: sentiment mix and time trends. Aggregate stats only—no raw comment list.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'channel-id', type: 'int64', required: true, min: 1, desc: 'Channel ID from search_posts results.' },
    { name: 'uuid', type: 'string', required: true, desc: 'Content UUID from search_posts results.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Comment publish time lower bound; defaults to this post\'s publishTime from search_posts/get_post_detail.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Comment publish time upper bound. Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const channelId = ctx.int64('channel-id');
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