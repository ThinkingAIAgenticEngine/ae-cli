import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const testDatasourceConnect: Command = {
  service: 'dataops_integration',
  command: '+test_datasource_connect',
  description: 'Test datasource connection (temporary configuration, not saved). Pass component name and connection configuration JSON, returns connection success or failure and error information. Suitable for verifying connection parameters are correct before creating a datasource, avoiding connection failure after creation. Difference from integration_add_datasource: This tool only tests connection without creating datasource, can debug repeatedly until connection succeeds before formally creating',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'componentName', type: 'string', required: true, desc: 'Component name (e.g., MySQL, Hive, ClickHouse)' },
    { name: 'configValue', type: 'string', required: true, desc: 'Connection configuration JSON string' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_test_datasource_connect', {
      spaceCode: ctx.str('spaceCode'),
      componentName: ctx.str('componentName'),
      configValue: ctx.str('configValue'),
    });
    return parseMcpResult(result);
  },
};