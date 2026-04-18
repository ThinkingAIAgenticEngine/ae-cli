import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getQueryResult: Command = {
  service: 'dataops_ide',
  command: '+get_query_result',
  description: 'Gets result data details (column names + row data) for a specific query record. Returns: columns(column definitions), rows(data rows). Requires recordId (obtainable via ide_list_query_history). Note: Only queries with SUCCESS status have result data',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: true, desc: 'Connection type: SPACE(data warehouse for daily queries, default), ETL(ETL engine for data processing), APP(app warehouse for external services)' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'recordId', type: 'number', required: true, desc: 'Query record ID (obtainable via ide_list_query_history)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_get_query_result', {
      spaceCode: ctx.str('spaceCode'),
      connType: ctx.str('connType'),
      repoCode: ctx.str('repoCode'),
      recordId: ctx.num('recordId'),
    });
    return parseMcpResult(result);
  },
};