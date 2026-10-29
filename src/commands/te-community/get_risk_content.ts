import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getRiskContent: Command = {
  service: 'community',
  command: '+get_risk_content',
  description: 'List content flagged as risk/moderation items; filter by risk type and time.',
  flags: [
    { name: 'space-id', type: 'int64', required: true, min: 1, desc: 'Community space ID. Discover it with: ae-cli community spaces list' },
    { name: 'game-id', type: 'int64', required: false, min: 1, desc: 'Deprecated compatibility alias; defaults to --space-id and must match it.' },
    { name: 'start-time', type: 'string', required: true, desc: 'Risk content publish time lower bound. Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: true, desc: 'Risk content publish time upper bound. Format: yyyy-MM-dd.' },
    { name: 'risk-codes', type: 'string', required: false, desc: 'Risk type code list.' },
    { name: 'search-word', type: 'string', required: false, desc: 'Keyword search; fuzzy match on body text.' },
    { name: 'include-trends', type: 'boolean', required: false, desc: 'Whether to include trend aggregates in the response.' },
    { name: 'order-by', type: 'number', required: false, desc: 'Sort: 0 publish time desc.' },
    { name: 'page-num', type: 'number', required: false, desc: 'Page number, starting at 1.' },
    { name: 'page-size', type: 'number', required: false, desc: 'Page size. Max 10000.' },
  ],
  risk: 'read',
  execute: async (ctx: RuntimeContext) => {
    const spaceId = ctx.int64('space-id');
    const gameId = ctx.optionalInt64('game-id') ?? spaceId;
    const startTime = ctx.str('start-time');
    const endTime = ctx.str('end-time');
    const host = ctx.host();

    const param: Record<string, any> = { gameId, startTime, endTime };

    const riskCodes = ctx.str('risk-codes');
    if (riskCodes) param.riskCodes = riskCodes.split(',').map((value) => BigInt(value.trim()));

    const searchWord = ctx.str('search-word');
    if (searchWord) param.searchWord = searchWord;

    const includeTrends = ctx.optionalBool('include-trends');
    if (includeTrends !== undefined) param.includeTrends = includeTrends;

    const orderBy = ctx.optionalNum('order-by');
    const pageNum = ctx.optionalNum('page-num');
    const pageSize = ctx.optionalNum('page-size');
    if (orderBy !== undefined || pageNum !== undefined || pageSize !== undefined) {
      param.pagerHeader = {};
      if (orderBy !== undefined) param.pagerHeader.orderBy = orderBy;
      if (pageNum !== undefined) param.pagerHeader.pageNum = pageNum;
      if (pageSize !== undefined) param.pagerHeader.pageSize = pageSize;
    }

    const args = { spaceId, param };

    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), host, 'community_content');
    const result = await callMcpTool(mcpUrl, 'get_risk_content', args, host);
    return parseMcpResult(result);
  },
};
