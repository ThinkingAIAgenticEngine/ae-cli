import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getExecuteRecord: Command = {
  service: 'dataops_flow',
  command: '+get_execute_record',
  description: 'Query details of a specified execution record, including execution status, start/end time, trigger method. Returns: executeId, status, startTime, endTime, triggerType, env. Requires executeId (can be obtained via flow_list_flow_instances). Related tools: flow_get_execute_dag',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'executeId', type: 'number', required: true, desc: 'Execution record ID (can be obtained via flow_list_flow_instances)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_get_execute_record', {
      spaceCode: ctx.str('spaceCode'),
      executeId: ctx.num('executeId'),
    });
    return parseMcpResult(result);
  },
};