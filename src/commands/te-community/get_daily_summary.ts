import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getDailySummary: Command = {
  service: 'community',
  command: '+get_daily_summary',
  description: 'Daily community summary for a given date: hot topic rankings and highlighted opinions (positive/negative).',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'date', type: 'string', required: true, desc: 'Summary date. Format: yyyy-MM-dd.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const date = ctx.str('date');
    const host = ctx.host();

    const param = { gameId, date };

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_hot');
    const result = await callMcpTool(mcpUrl, 'get_daily_summary', args, host);
    return parseMcpResult(result);
  },
};