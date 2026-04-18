import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getExecuteDag: Command = {
  service: 'dataops_flow',
  command: '+get_execute_dag',
  description: 'Query the runtime-state DAG of an execution instance, including execution status (success/failure/running/waiting) of each task node. Returns: tasks (list of taskCode/taskName/status/bsTaskInstanceId), relations. Suitable for diagnosing task flow execution issues, locating failed nodes. bsTaskInstanceId + taskCode are used for flow_get_task_instance_log. Difference from flow_get_flow_dag: This tool returns runtime-state DAG (including execution status), flow_get_flow_dag returns definition-state DAG (static structure)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'executeId', type: 'number', required: true, desc: 'Execution record ID (can be obtained via flow_list_flow_instances)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_get_execute_dag', {
      spaceCode: ctx.str('spaceCode'),
      executeId: ctx.num('executeId'),
    });
    return parseMcpResult(result);
  },
};