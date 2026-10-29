import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getTagTrends: Command = {
  service: 'community',
  command: '+get_tag_trends',
  description: 'Daily tag trends: given tagCode and date range, returns counts and time series per tag value.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'tag-code', type: 'string', required: true, desc: 'Tag code (tagCode) from +get_corpus_tags.' },
    { name: 'channel-id-list', type: 'string', required: false, desc: 'Channel IDs from +get_channel_info.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Statistics range start (inclusive). Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Statistics range end (inclusive). Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const tagCode = ctx.str('tag-code');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, tagCode };

    const channelIdList = ctx.str('channel-id-list');
    if (channelIdList) param.channelIdList = channelIdList.split(',').map((value) => BigInt(value.trim()));

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