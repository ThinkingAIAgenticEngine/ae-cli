import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const executeFlow: Command = {
  service: 'dataops_flow',
  command: '+execute_flow',
  description: 'Manually trigger task flow execution. Write operation requires two-step confirmation. Executes in DEV environment by default, can specify PROD environment via env parameter. Returns: executeId, status. Related tools: flow_list_flow_instances (view execution history), flow_stop_flow (stop execution)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_execute_flow', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      env: ctx.str('env'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};