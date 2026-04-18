import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const stopFlow: Command = {
  service: 'dataops_flow',
  command: '+stop_flow',
  description: 'Stop a running task flow instance. Write operation requires two-step confirmation. Requires executeId (can be obtained via flow_list_flow_instances). Note: Stopping will terminate currently running tasks, which operation cannot be undone',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'executeId', type: 'number', required: true, desc: 'Execution record ID (can be obtained via flow_list_flow_instances)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_stop_flow', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      executeId: ctx.num('executeId'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};