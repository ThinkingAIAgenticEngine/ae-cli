import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const searchTables: Command = {
  service: 'dataops_ide',
  command: '+search_tables',
  description: 'Fuzzy search tables by keyword across catalog/schema. Returns: tableName, catalogName, schemaName, tableType. Difference from datatable_search_tables: This tool queries real-time metadata from the data warehouse engine, datatable queries dataops platform registered metadata(including business descriptions)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: true, desc: 'Connection type: SPACE(data warehouse for daily queries, default), ETL(ETL engine for data processing), APP(app warehouse for external services)' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'searchKey', type: 'string', required: true, desc: 'Search keyword' },
    { name: 'size', type: 'number', required: true, desc: 'Maximum number of results to return' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_search_tables', {
      spaceCode: ctx.str('spaceCode'),
      connType: ctx.str('connType'),
      repoCode: ctx.str('repoCode'),
      searchKey: ctx.str('searchKey'),
      size: ctx.num('size'),
    });
    return parseMcpResult(result);
  },
};