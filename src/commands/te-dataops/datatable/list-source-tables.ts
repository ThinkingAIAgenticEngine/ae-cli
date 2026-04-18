import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSourceTables: Command = {
  service: 'dataops_datatable',
  command: '+list_source_tables',
  description: 'List tables under direct connection source schema, used for selecting source tables when creating direct connection views. Returns: tableName, tableType, columns (column definitions), partitionColumns (partition columns). Only displays tables user has permission to access, queries data warehouse engine metadata in real-time',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'srcRepoCode', type: 'string', required: true, desc: 'Source repository code' },
    { name: 'srcCatalog', type: 'string', required: true, desc: 'Source catalog name' },
    { name: 'srcSchema', type: 'string', required: true, desc: 'Source schema/database name' },
    { name: 'search', type: 'string', required: false, desc: 'Search keyword (table name prefix match)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'linkview_list_source_tables', {
      spaceCode: ctx.str('spaceCode'),
      srcRepoCode: ctx.str('srcRepoCode'),
      srcCatalog: ctx.str('srcCatalog'),
      srcSchema: ctx.str('srcSchema'),
      search: ctx.str('search'),
    });
    return parseMcpResult(result);
  },
};