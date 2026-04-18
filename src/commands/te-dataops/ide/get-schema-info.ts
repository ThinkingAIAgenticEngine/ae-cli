import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getSchemaInfo: Command = {
  service: 'dataops_ide',
  command: '+get_schema_info',
  description: 'Gets schema statistics, including table count and view count. Returns: tableCount, viewCount',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: true, desc: 'Connection type: SPACE(data warehouse for daily queries, default), ETL(ETL engine for data processing), APP(app warehouse for external services)' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_get_schema_info', {
      spaceCode: ctx.str('spaceCode'),
      connType: ctx.str('connType'),
      repoCode: ctx.str('repoCode'),
      catalog: ctx.str('catalog'),
      schema: ctx.str('schema'),
    });
    return parseMcpResult(result);
  },
};