import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSpaceDatasources: Command = {
  service: 'dataops_integration',
  command: '+list_space_datasources',
  description: 'Query datasources under a space, supports optional filtering by name and component type, all results include complete configuration details. Not passing filter parameters returns all datasources under the space; pass dataSourceName for exact name matching (business unique, returns 0 or 1 result); pass componentName to filter by component type (e.g., only view all MySQL datasources); two filter parameters can be used alone or in combination. Returns: datasourceId (datasource ID, for subsequent Tool calls), dataSourceComponentName (component type), dataSourceName (name), dataSourceRemark (remark), dataSourceStatus (NORMAL/OFFLINE), connectStatus (SUCCESS/CLOSED/FAILED), syncTaskNum (number of sync tasks), sharedConfig (whether shared configuration), connectConfig (connection configuration, includes envJsonList, password desensitized), connectFails (connection failure reasons), lastConnectTime (last successful connection time)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceName', type: 'string', required: false, desc: 'Datasource name, exact filter (business unique within space)' },
    { name: 'componentName', type: 'string', required: false, desc: 'Component type (e.g., MySQL, Hive, ClickHouse), filter by type' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_list_space_datasources', {
      spaceCode: ctx.str('spaceCode'),
      datasourceName: ctx.str('datasourceName'),
      componentName: ctx.str('componentName'),
    });
    return parseMcpResult(result);
  },
};