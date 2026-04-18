import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const dictSearchTables: Command = {
  service: 'dataops_datatable',
  command: '+dict_search_tables',
  description: 'Search tables in dataops data dictionary, supports fuzzy search by table name or description. Returns up to maxResults results (default 200), plus totalCount and hasMore flags. Returns: entityId (table entity ID), tableName (table name), schema (database name), catalog (catalog name), repoCode (repository code), tableType (0=physical table/1=view), tableComment (table description), tableRemark (table remark). Use cases: Browse or search registered data assets in space. If too many results, narrow range with search parameter. Difference from ide_search_tables: This tool queries dataops platform registered metadata (including business descriptions), ide_search_tables directly queries data warehouse engine (real-time metadata, cross catalog/schema)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'search', type: 'string', required: false, desc: 'Search keyword (fuzzy match on table name/remark/description)' },
    { name: 'maxResults', type: 'number', required: false, desc: 'Max return count, default 200, max 200' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'datatable_dict_search_tables', {
      spaceCode: ctx.str('spaceCode'),
      search: ctx.str('search'),
      maxResults: ctx.num('maxResults'),
    });
    return parseMcpResult(result);
  },
};