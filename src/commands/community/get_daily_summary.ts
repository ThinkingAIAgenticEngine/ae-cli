import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getDailySummary: Command = {
  service: 'community',
  command: 'get_daily_summary',
  description: 'Daily community summary for a given date: hot topic rankings and highlighted opinions (positive/negative).',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'date', type: 'string', required: true, desc: 'Summary date. Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.num('space-id');
    const gameId = ctx.num('game-id');
    const date = ctx.str('date');
    const host = ctx.host();

    const param = { gameId, date };

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_hot');
    const result = await callMcpTool(mcpUrl, 'get_daily_summary', args, host);
    return parseMcpResult(result);
  },
};
