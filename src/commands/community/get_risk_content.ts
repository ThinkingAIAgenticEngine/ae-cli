import type { Command, RuntimeContext } from '../../framework/types.js';
import { resolveMcpUrl, callMcpTool, parseMcpResult } from '../../core/mcp.js';

export const getRiskContent: Command = {
  service: 'community',
  command: 'get_risk_content',
  description: 'List content flagged as risk/moderation items; filter by risk type and time.',
  flags: [
    { name: 'space-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'game-id', type: 'number', required: true, desc: 'Identifier of the community space. SpaceId' },
    { name: 'start-time', type: 'string', required: true, desc: 'Risk content publish time lower bound. Format: yyyy-MM-dd.' },
    { name: 'end-time', type: 'string', required: true, desc: 'Risk content publish time upper bound. Format: yyyy-MM-dd.' },
    { name: 'risk-codes', type: 'string', required: false, desc: 'Risk type code list.' },
    { name: 'search-word', type: 'string', required: false, desc: 'Keyword search; fuzzy match on body text.' },
    { name: 'include-trends', type: 'boolean', required: false, desc: 'Whether to include trend aggregates in the response.' },
    { name: 'order-by', type: 'number', required: false, desc: 'Sort: 0 publish time desc.' },
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

    const riskCodes = ctx.str('risk-codes');
    if (riskCodes) param.riskCodes = riskCodes.split(',').map(Number);

    const searchWord = ctx.str('search-word');
    if (searchWord) param.searchWord = searchWord;

    const includeTrends = ctx.bool('include-trends');
    if (includeTrends !== undefined) param.includeTrends = includeTrends;

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
    const result = await callMcpTool(mcpUrl, 'get_risk_content', args, host);
    return parseMcpResult(result);
  },
};
