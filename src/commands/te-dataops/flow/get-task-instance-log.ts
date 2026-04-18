import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getTaskInstanceLog: Command = {
  service: 'dataops_flow',
  command: '+get_task_instance_log',
  description: 'Query running logs of a specified task instance, supports pagination. Returns: log, offset, hasMore. Suitable for diagnosing task execution failure causes. Note: This tool does not require spaceCode. For large logs can use startOffset/limit for paginated reading. Requires bsTaskInstanceId and taskCode (can be obtained via flow_get_execute_dag)',
  flags: [
    { name: 'bsTaskInstanceId', type: 'number', required: true, desc: 'BS task instance ID (can be obtained via flow_get_execute_dag)' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Task code (can be obtained via flow_get_execute_dag)' },
    { name: 'startOffset', type: 'number', required: false, desc: 'Starting offset, defaults to 0 if not provided' },
    { name: 'limit', type: 'number', required: false, desc: 'Number of lines to return, defaults to 100 if not provided' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_get_task_instance_log', {
      bsTaskInstanceId: ctx.num('bsTaskInstanceId'),
      taskCode: ctx.num('taskCode'),
      startOffset: ctx.num('startOffset'),
      limit: ctx.num('limit'),
    });
    return parseMcpResult(result);
  },
};