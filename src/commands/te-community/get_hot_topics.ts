import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getHotTopics: Command = {
  service: 'community',
  command: '+get_hot_topics',
  description: 'Hot topics leaderboard over a time range.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'start-time', type: 'string', required: false, desc: 'Topic statistics range start (inclusive). Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Topic statistics range end (inclusive). Format: yyyy-MM-dd.' },
    { name: 'order-by', type: 'number', required: false, desc: 'Sort: 0 by topic heat desc, 1 by topic start time desc.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const host = ctx.host();

    const param: Record<string, any> = { gameId };

    const startTime = ctx.str('start-time');
    if (startTime) param.startTime = startTime;

    const endTime = ctx.str('end-time');
    if (endTime) param.endTime = endTime;

    const orderBy = ctx.optionalNum('order-by');
    if (orderBy !== undefined) param.orderBy = orderBy;

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_hot');
    const result = await callMcpTool(mcpUrl, 'get_hot_topics', args, host);
    return parseMcpResult(result);
  },
};
