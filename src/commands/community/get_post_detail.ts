import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getPostDetail: Command = {
  service: 'community',
  command: 'get_post_detail',
  description: 'Full detail for one post/video: body, media, subtitles, danmu, sentiment, keywords, topics, tag values, and comment pager.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'channel-id', type: 'number', required: true, desc: 'Channel ID.' },
    { name: 'uuid', type: 'string', required: true, desc: 'Content UUID (unique id).' },
    { name: 'resource-type', type: 'number', required: true, desc: 'Resource type: 0 post, 1 video.' },
    { name: 'danmu-order-by', type: 'number', required: false, desc: 'Sort for danmu: 0 video timestamp desc, 1 publish time desc.' },
    { name: 'danmu-page-num', type: 'number', required: false, desc: 'Page number for danmu pagination, starting at 1.' },
    { name: 'danmu-page-size', type: 'number', required: false, desc: 'Page size for danmu pagination.' },
    { name: 'reply-order-by', type: 'number', required: false, desc: 'Sort for comments: 0 publish time desc, 1 publish time asc.' },
    { name: 'reply-page-num', type: 'number', required: false, desc: 'Page number for comments, starting at 1.' },
    { name: 'reply-page-size', type: 'number', required: false, desc: 'Page size for comments.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const channelId = ctx.num('channel-id');
    const uuid = ctx.str('uuid');
    const resourceType = ctx.num('resource-type');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, channelId, uuid, resourceType };

    const danmuOrderBy = ctx.num('danmu-order-by');
    const danmuPageNum = ctx.num('danmu-page-num');
    const danmuPageSize = ctx.num('danmu-page-size');
    if (danmuOrderBy !== undefined || danmuPageNum || danmuPageSize) {
      param.danmuPagerHeader = {};
      if (danmuOrderBy !== undefined) param.danmuPagerHeader.orderBy = danmuOrderBy;
      if (danmuPageNum) param.danmuPagerHeader.pageNum = danmuPageNum;
      if (danmuPageSize) param.danmuPagerHeader.pageSize = danmuPageSize;
    }

    const replyOrderBy = ctx.num('reply-order-by');
    const replyPageNum = ctx.num('reply-page-num');
    const replyPageSize = ctx.num('reply-page-size');
    if (replyOrderBy !== undefined || replyPageNum || replyPageSize) {
      param.replyPagerHeader = {};
      if (replyOrderBy !== undefined) param.replyPagerHeader.orderBy = replyOrderBy;
      if (replyPageNum) param.replyPagerHeader.pageNum = replyPageNum;
      if (replyPageSize) param.replyPagerHeader.pageSize = replyPageSize;
    }

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_post_detail', args, host);
    return parseMcpResult(result);
  },
};
