import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSyncDatasources: Command = {
  service: 'dataops_integration',
  command: '+list_sync_datasources',
  description: 'Get list of datasources available for sync solutions, categorized by source (data source) and sink (data target). Returns: sources (list of datasources that can be used as source), sinks (list of datasources that can be used as target), each item contains datasourceId, name, component type. Suitable for understanding which datasources can be used as source or target before creating sync solutions. Difference from integration_list_space_datasources: This tool categorizes by sync role (source/sink) and only returns datasources available for sync; list_space_datasources returns all datasources under the space with complete configuration',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_list_sync_datasources', {
      spaceCode: ctx.str('spaceCode'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};