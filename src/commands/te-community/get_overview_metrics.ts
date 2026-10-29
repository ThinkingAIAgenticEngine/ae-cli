import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getOverviewMetrics: Command = {
  service: 'community',
  command: '+get_overview_metrics',
  description: 'Overall community metrics in a date range: post/reply counts, sentiment counts, per-channel breakdown.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'channel-id-list', type: 'string', required: false, desc: 'Channel IDs from +get_channel_info (channelId).' },
    { name: 'start-time', type: 'string', required: true, desc: 'Statistics range start (inclusive). Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: true, desc: 'Statistics range end (inclusive). Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const startTime = ctx.str('start-time');
    const endTime = ctx.str('end-time');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, startTime, endTime };

    const channelIdList = ctx.str('channel-id-list');
    if (channelIdList) param.channelIdList = channelIdList.split(',').map((value) => BigInt(value.trim()));

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_analysis');
    const result = await callMcpTool(mcpUrl, 'get_overview_metrics', args, host);
    return parseMcpResult(result);
  },
};