import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getSyncExecInfo: Command = {
  service: 'dataops_integration',
  command: '+get_sync_exec_info',
  description: 'Get detailed information of a single sync solution execution, including execution status, read/write row counts, elapsed time and other metrics. Returns: status (execution status), readCount/writeCount (read/write row counts), startTime/endTime (start/end time), duration (elapsed time). Requires syncId and taskId (can be obtained via integration_list_sync_exec_histories). Suitable for understanding data volume and performance of sync execution',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'taskId', type: 'string', required: true, desc: 'Execution task ID' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_get_sync_exec_info', {
      spaceCode: ctx.str('spaceCode'),
      syncId: ctx.str('syncId'),
      taskId: ctx.str('taskId'),
    });
    return parseMcpResult(result);
  },
};