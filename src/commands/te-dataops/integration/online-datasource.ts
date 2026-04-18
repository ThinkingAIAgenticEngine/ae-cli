import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const onlineDatasource: Command = {
  service: 'dataops_integration',
  command: '+online_datasource',
  description: 'Batch online datasources. Write operation requires two-step confirmation: First call returns operation preview, after confirmation set confirmed=true to execute online. After online, datasource status becomes NORMAL, associated sync solutions can execute normally. Used for scenarios where offline datasources need to be re-enabled',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'dataSourceNames', type: 'string', required: true, desc: 'Datasource name list (comma-separated)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Whether confirmed to execute, defaults to false if not passed' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_online_datasource', {
      spaceCode: ctx.str('spaceCode'),
      dataSourceNames: ctx.str('dataSourceNames'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};