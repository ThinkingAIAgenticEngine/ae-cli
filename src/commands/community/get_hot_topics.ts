import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getHotTopics: Command = {
  service: 'community',
  command: 'get_hot_topics',
  description: 'Hot topics leaderboard over a time range.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'start-time', type: 'string', required: false, desc: 'Topic statistics range start (inclusive). Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: false, desc: 'Topic statistics range end (inclusive). Format: yyyy-MM-dd.' },
    { name: 'order-by', type: 'number', required: false, desc: 'Sort: 0 by topic heat desc, 1 by topic start time desc.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const host = ctx.host();

    const param: Record<string, any> = { gameId };

    const startTime = ctx.str('start-time');
    if (startTime) param.startTime = startTime;

    const endTime = ctx.str('end-time');
    if (endTime) param.endTime = endTime;

    const orderBy = ctx.num('order-by');
    if (orderBy !== undefined) param.orderBy = orderBy;

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_hot');
    const result = await callMcpTool(mcpUrl, 'get_hot_topics', args, host);
    return parseMcpResult(result);
  },
};
