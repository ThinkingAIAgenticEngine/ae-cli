import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getLivestreamDetail: Command = {
  service: 'community',
  command: '+get_livestream_detail',
  description: 'One live session detail: interaction leaderboards and paginated interaction feed.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'stream-id', type: 'string', required: true, desc: 'Live session ID (streamId) from +get_livestream_list.' },
    { name: 'activity-types', type: 'string', required: false, desc: 'Activity type codes to filter details: 0 danmu, 1 gift, 2 superchat, 3 premium. Comma-separated.' },
    { name: 'anchor-time', type: 'string', required: false, desc: 'Anchor time for interactions. Format: yyyy-MM-dd HH:mm.' },
    { name: 'search-word', type: 'string', required: false, desc: 'Keyword to filter interaction detail rows.' },
    { name: 'order-by', type: 'number', required: false, desc: 'Sort: 0 interaction time desc, 1 interaction time asc.' },
    { name: 'page-num', type: 'number', required: false, desc: 'Page number, starting at 1.' },
    { name: 'page-size', type: 'number', required: false, desc: 'Page size. Max 10000.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const streamId = ctx.str('stream-id');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, streamId };

    const activityTypes = ctx.str('activity-types');
    if (activityTypes) param.activityType = activityTypes.split(',').map(Number);

    const anchorTime = ctx.str('anchor-time');
    if (anchorTime) param.anchorTime = anchorTime;

    const searchWord = ctx.str('search-word');
    if (searchWord) param.searchWord = searchWord;

    const orderBy = ctx.optionalNum('order-by');
    const pageNum = ctx.optionalNum('page-num');
    const pageSize = ctx.optionalNum('page-size');
    if (orderBy !== undefined || pageNum !== undefined || pageSize !== undefined) {
      param.pagerHeader = {};
      if (orderBy !== undefined) param.pagerHeader.orderBy = orderBy;
      if (pageNum !== undefined) param.pagerHeader.pageNum = pageNum;
      if (pageSize !== undefined) param.pagerHeader.pageSize = pageSize;
    }

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_livestream_detail', args, host);
    return parseMcpResult(result);
  },
};
