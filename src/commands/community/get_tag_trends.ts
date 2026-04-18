import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getTagTrends: Command = {
  service: 'community',
  command: 'get_tag_trends',
  description: 'Daily tag trends: given tagCode and date range, returns counts and time series per tag value.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'tag-code', type: 'string', required: true, desc: 'Tag code (tagCode) from get_corpus_tags.' },
    { name: 'channel-id-list', type: 'string', required: false, desc: 'Channel IDs from get_channel_info.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Statistics range start (inclusive). Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Statistics range end (inclusive). Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const tagCode = ctx.str('tag-code');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, tagCode };

    const channelIdList = ctx.str('channel-id-list');
    if (channelIdList) param.channelIdList = channelIdList.split(',').map(Number);

    const startTime = ctx.str('start-time');
    if (startTime) param.startTime = startTime;

    const endTime = ctx.str('end-time');
    if (endTime) param.endTime = endTime;

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_analysis');
    const result = await callMcpTool(mcpUrl, 'get_tag_trends', args, host);
    return parseMcpResult(result);
  },
};
