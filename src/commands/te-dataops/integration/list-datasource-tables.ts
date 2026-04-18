import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listDatasourceTables: Command = {
  service: 'dataops_integration',
  command: '+list_datasource_tables',
  description: 'Get the list of tables under a specified database in a datasource. Returns: list of table names. Requires datasourceId and database (database name can be obtained via integration_list_datasource_databases). Suitable for browsing tables in a datasource, finding target tables. After getting table names, can call integration_get_table_structure to view column definitions, or call integration_preview_datasource_data to preview data',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID' },
    { name: 'database', type: 'string', required: true, desc: 'Database/schema name' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_list_datasource_tables', {
      spaceCode: ctx.str('spaceCode'),
      datasourceId: ctx.str('datasourceId'),
      database: ctx.str('database'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};