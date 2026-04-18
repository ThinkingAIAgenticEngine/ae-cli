import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const modifyDatasource: Command = {
  service: 'dataops_integration',
  command: '+modify_datasource',
  description: 'Modify datasource configuration. Write operation requires two-step confirmation: First call returns operation preview, after confirmation set confirmed=true to execute modification. Supports modifying remark, shared configuration, connection parameters, etc. Only need to pass fields to be modified, unpassed fields remain unchanged. When modifying connection config, envJsonList format is same as integration_add_datasource. Note: Modifying connection parameters may affect running sync solutions',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'dataSourceName', type: 'string', required: true, desc: 'Datasource name' },
    { name: 'dataSourceRemark', type: 'string', required: false, desc: 'New remark (not passed means not modified)' },
    { name: 'sharedConfig', type: 'boolean', required: false, desc: 'Whether to share configuration (not passed means not modified)' },
    { name: 'envJsonList', type: 'string', required: false, desc: 'New environment config JSON array string (not passed means not modified)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Whether confirmed to execute, defaults to false if not passed' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_modify_datasource', {
      spaceCode: ctx.str('spaceCode'),
      dataSourceName: ctx.str('dataSourceName'),
      dataSourceRemark: ctx.str('dataSourceRemark'),
      sharedConfig: ctx.bool('sharedConfig'),
      envJsonList: ctx.str('envJsonList'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};