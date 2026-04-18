import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const stopSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+stop_sync_solution',
  description: 'Stop a running sync solution. Write operation requires two-step confirmation: first call returns operation preview (with impact warning), confirm by setting confirmed=true to execute stop. Requires syncId and taskId (taskId can be obtained via integration_list_sync_exec_histories for currently running tasks). Note: After stopping, data may be in an incomplete state, need to re-execute complete sync to ensure data consistency',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'taskId', type: 'string', required: true, desc: 'Execution task ID' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_stop_sync_solution', {
      spaceCode: ctx.str('spaceCode'),
      syncId: ctx.str('syncId'),
      taskId: ctx.str('taskId'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};