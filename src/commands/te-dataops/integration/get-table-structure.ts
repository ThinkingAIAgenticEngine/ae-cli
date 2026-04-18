import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getTableStructure: Command = {
  service: 'dataops_integration',
  command: '+get_table_structure',
  description: 'Get column definitions and partition information for a datasource table. Returns: columns (column name/type/comment), partitions (partition information). Requires datasourceId, database, and tablePath (table path). Suitable for understanding table structure, confirming source table schema before creating application tables. Difference from datatable_get_table_detail: This tool queries external datasource metadata, requires datasourceId; datatable_get_table_detail queries dataops platform registered information',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID' },
    { name: 'database', type: 'string', required: true, desc: 'Database name' },
    { name: 'tablePath', type: 'string', required: true, desc: 'Table path (e.g., schema.table)' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_get_table_structure', {
      spaceCode: ctx.str('spaceCode'),
      datasourceId: ctx.str('datasourceId'),
      database: ctx.str('database'),
      tablePath: ctx.str('tablePath'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};