import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getPostDetail: Command = {
  service: 'community',
  command: '+get_post_detail',
  description: 'Full detail for one post/video: body, media, subtitles, danmu, sentiment, keywords, topics, tag values, and comment pager.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'channel-id', type: 'int64', required: true, min: 1, desc: 'Channel ID.' },
    { name: 'uuid', type: 'string', required: true, desc: 'Content UUID (unique id).' },
    { name: 'resource-type', type: 'number', required: true, desc: 'Resource type: 0 post, 1 video.' },
    { name: 'danmu-order-by', type: 'number', required: false, desc: 'Sort for danmu: 0 video timestamp desc, 1 publish time desc.' },
    { name: 'danmu-page-num', type: 'number', required: false, desc: 'Page number for danmu pagination, starting at 1.' },
    { name: 'danmu-page-size', type: 'number', required: false, desc: 'Page size for danmu pagination. Max 10000.' },
    { name: 'reply-order-by', type: 'number', required: false, desc: 'Sort for comments: 0 publish time desc, 1 publish time asc.' },
    { name: 'reply-page-num', type: 'number', required: false, desc: 'Page number for comments, starting at 1.' },
    { name: 'reply-page-size', type: 'number', required: false, desc: 'Page size for comments. Max 10000.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const channelId = ctx.int64('channel-id');
    const uuid = ctx.str('uuid');
    const resourceType = ctx.num('resource-type');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, channelId, uuid, resourceType };

    const danmuOrderBy = ctx.optionalNum('danmu-order-by');
    const danmuPageNum = ctx.optionalNum('danmu-page-num');
    const danmuPageSize = ctx.optionalNum('danmu-page-size');
    if (danmuOrderBy !== undefined || danmuPageNum !== undefined || danmuPageSize !== undefined) {
      param.danmuPagerHeader = {};
      if (danmuOrderBy !== undefined) param.danmuPagerHeader.orderBy = danmuOrderBy;
      if (danmuPageNum !== undefined) param.danmuPagerHeader.pageNum = danmuPageNum;
      if (danmuPageSize !== undefined) param.danmuPagerHeader.pageSize = danmuPageSize;
    }

    const replyOrderBy = ctx.optionalNum('reply-order-by');
    const replyPageNum = ctx.optionalNum('reply-page-num');
    const replyPageSize = ctx.optionalNum('reply-page-size');
    if (replyOrderBy !== undefined || replyPageNum !== undefined || replyPageSize !== undefined) {
      param.replyPagerHeader = {};
      if (replyOrderBy !== undefined) param.replyPagerHeader.orderBy = replyOrderBy;
      if (replyPageNum !== undefined) param.replyPagerHeader.pageNum = replyPageNum;
      if (replyPageSize !== undefined) param.replyPagerHeader.pageSize = replyPageSize;
    }

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_post_detail', args, host);
    return parseMcpResult(result);
  },
};
