import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getFlowDag: Command = {
  service: 'dataops_flow',
  command: '+get_flow_dag',
  description: 'Get the definition-state DAG structure of a task flow, including all task nodes, dependencies between nodes, and canvas position information. Returns: tasks (list of taskCode/taskName/taskType), relations (dependencies), locations (canvas positions). Used to understand the orchestration structure of task flows. The returned taskCode can be used in tools like flow_save_task_definition. Difference from flow_get_execute_dag: This tool returns definition-state DAG (static structure), flow_get_execute_dag returns runtime-state DAG (including execution status of each node)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_get_flow_dag', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};