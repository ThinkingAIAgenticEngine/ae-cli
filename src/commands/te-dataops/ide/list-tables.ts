import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listTables: Command = {
  service: 'dataops_ide',
  command: '+list_tables',
  description: 'Paginated list of tables/views under a schema. Returns: tableName, tableType. Defaults to physical tables, set isView=true to return views',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: true, desc: 'Connection type: SPACE(data warehouse for daily queries, default), ETL(ETL engine for data processing), APP(app warehouse for external services)' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name' },
    { name: 'isView', type: 'boolean', required: true, desc: 'Whether to query views, default false returns physical tables, set true to return views' },
    { name: 'pageNum', type: 'number', required: true, desc: 'Page number, default 1' },
    { name: 'pageSize', type: 'number', required: true, desc: 'Page size, default 100' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_list_tables', {
      spaceCode: ctx.str('spaceCode'),
      connType: ctx.str('connType'),
      repoCode: ctx.str('repoCode'),
      catalog: ctx.str('catalog'),
      schema: ctx.str('schema'),
      isView: ctx.bool('isView'),
      pageNum: ctx.num('pageNum'),
      pageSize: ctx.num('pageSize'),
    });
    return parseMcpResult(result);
  },
};