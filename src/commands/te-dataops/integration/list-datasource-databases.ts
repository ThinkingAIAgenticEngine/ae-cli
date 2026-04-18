import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listDatasourceDatabases: Command = {
  service: 'dataops_integration',
  command: '+list_datasource_databases',
  description: 'Get the list of databases/schemas under a datasource. Returns: list of database/schema names. Requires datasourceId (can be obtained via integration_list_space_datasources). Suitable for browsing datasource structure, providing database name parameters for subsequent table queries. Call chain: integration_list_space_datasources → this tool → integration_list_datasource_tables → integration_get_table_structure',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_list_datasource_databases', {
      spaceCode: ctx.str('spaceCode'),
      datasourceId: ctx.str('datasourceId'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};