import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getSentimentOverview: Command = {
  service: 'community',
  command: 'get_sentiment_overview',
  description: 'Sentiment distribution and hot-keyword overview: top keywords per sentiment with trends, plus overall keyword ranking.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'channel-id-list', type: 'string', required: false, desc: 'Channel IDs from get_channel_info (channelId).' },
    { name: 'start-time', type: 'string', required: true, desc: 'Statistics range start (inclusive). Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: true, desc: 'Statistics range end (inclusive). Format: yyyy-MM-dd.' },
    { name: 'is-merged', type: 'boolean', required: false, desc: 'Whether to aggregate merged keywords.' },
    { name: 'limit', type: 'number', required: false, desc: 'Max number of keywords to return.' },
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

    const isMerged = ctx.bool('is-merged');
    if (isMerged !== undefined) param.isMerged = isMerged;

    const limit = ctx.num('limit');
    if (limit) param.limit = limit;

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_analysis');
    const result = await callMcpTool(mcpUrl, 'get_sentiment_overview', args, host);
    return parseMcpResult(result);
  },
};
