import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const searchPosts: Command = {
  service: 'community',
  command: 'search_posts',
  description: 'Search social posts/videos/feeds in a community space.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'channel-id-list', type: 'string', required: false, desc: 'Channel IDs from get_channel_info (channelId). Comma-separated.' },
    { name: 'keywords', type: 'string', required: false, desc: 'Keyword filter list. Comma-separated.' },
    { name: 'start-time', type: 'string', required: true, desc: 'Content publish time lower bound. Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: true, desc: 'Content publish time upper bound. Format: yyyy-MM-dd.' },
    { name: 'official', type: 'boolean', required: false, desc: 'If true, only official accounts.' },
    { name: 'resource-type', type: 'string', required: false, desc: 'Resource types: 0 post, 1 video. Comma-separated.' },
    { name: 'search-mode', type: 'number', required: false, desc: 'Search mode: 0 tokenized (default), 1 exact substring (e.g. \\"#tag\\" matches only posts containing that full string), 2 author name.' },
    { name: 'search-word', type: 'string', required: false, desc: 'Full-text query; used together with searchMode.' },
    { name: 'sentiment-types', type: 'string', required: false, desc: 'Sentiment filter: 0 negative, 1 positive, 2 neutral. Comma-separated.' },
    { name: 'order-by', type: 'number', required: false, desc: 'Sort: 0 publish time desc, 1 weight desc, 2 publish time asc, 3 reply count desc, 4 heat desc.' },
    { name: 'page-num', type: 'number', required: false, desc: 'Page number, starting at 1.' },
    { name: 'page-size', type: 'number', required: false, desc: 'Page size.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const startTime = ctx.str('start-time');
    const endTime = ctx.str('end-time');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, startTime, endTime };

    const channelIdList = ctx.str('channel-id-list');
    if (channelIdList) param.channelIdList = channelIdList.split(',').map(Number);

    const keywords = ctx.str('keywords');
    if (keywords) param.keywords = keywords.split(',');

    const official = ctx.bool('official');
    if (official !== undefined) param.official = official;

    const resourceType = ctx.str('resource-type');
    if (resourceType) param.resourceType = resourceType.split(',').map(Number);

    const searchMode = ctx.num('search-mode');
    if (searchMode !== undefined) param.searchMode = searchMode;

    const searchWord = ctx.str('search-word');
    if (searchWord) param.searchWord = searchWord;

    const sentimentTypes = ctx.str('sentiment-types');
    if (sentimentTypes) param.sentimentTypes = sentimentTypes.split(',').map(Number);

    const orderBy = ctx.num('order-by');
    const pageNum = ctx.num('page-num');
    const pageSize = ctx.num('page-size');
    if (orderBy !== undefined || pageNum || pageSize) {
      param.pagerHeader = {};
      if (orderBy !== undefined) param.pagerHeader.orderBy = orderBy;
      if (pageNum) param.pagerHeader.pageNum = pageNum;
      if (pageSize) param.pagerHeader.pageSize = pageSize;
    }

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'search_posts', args, host);
    return parseMcpResult(result);
  },
};
