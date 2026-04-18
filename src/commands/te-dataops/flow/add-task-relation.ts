import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const addTaskRelation: Command = {
  service: 'dataops_flow',
  command: '+add_task_relation',
  description: 'Add task dependency relationship (DAG connection), specify pre-task (upstream) and post-task (downstream). Write operation requires two-step confirmation. Note: Cannot create circular dependencies. Related tools: flow_delete_task_relation, flow_get_flow_dag',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'preTaskCode', type: 'number', required: true, desc: 'Pre-task code (upstream)' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Current task code (downstream)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_add_task_relation', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      preTaskCode: ctx.num('preTaskCode'),
      taskCode: ctx.num('taskCode'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};