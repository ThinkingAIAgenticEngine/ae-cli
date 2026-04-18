import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listTablesByPage: Command = {
  service: 'dataops_datatable',
  command: '+list_tables_by_page',
  description: 'Paginated query of tables registered on dataops platform, supports search and dimension statistics. Returns: entityId, tableName, schemaName, repoCode, tableType (0=table/1=view), remark, plus dimension statistics grouped by repo/catalog/schema. Difference from ide_search_tables: This tool queries dataops registered metadata (including business descriptions), ide_search_tables queries data warehouse engine real-time metadata',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'search', type: 'string', required: false, desc: 'Search keyword (fuzzy match on table name/remark/description)' },
    { name: 'pageNum', type: 'number', required: false, desc: 'Page number, default 1' },
    { name: 'pageSize', type: 'number', required: false, desc: 'Page size, default 20' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'datatable_list_tables_by_page', {
      spaceCode: ctx.str('spaceCode'),
      search: ctx.str('search'),
      pageNum: ctx.num('pageNum'),
      pageSize: ctx.num('pageSize'),
    });
    return parseMcpResult(result);
  },
};