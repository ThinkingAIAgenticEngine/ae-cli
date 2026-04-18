import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSyncExecHistories: Command = {
  service: 'dataops_integration',
  command: '+list_sync_exec_histories',
  description: 'Query execution history records of sync solutions, in reverse chronological order of execution time. Returns: taskId (task ID), execType (execution type), status (execution status), startTime/endTime (start/end time), duration (elapsed time). Can filter by execution type: SCHEDULE (scheduled), MANUAL (manual execution), DEBUG (debug). After getting taskId, can call integration_get_sync_exec_info to view execution details, or integration_get_sync_exec_log to view execution logs',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'execType', type: 'string', required: false, desc: 'Execution type: SCHEDULE (scheduled), MANUAL (manual execution), DEBUG (debug), if not provided query all' },
    { name: 'limit', type: 'number', required: false, desc: 'Number of results to return, defaults to 20 if not provided' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_list_sync_exec_histories', {
      spaceCode: ctx.str('spaceCode'),
      syncId: ctx.str('syncId'),
      execType: ctx.str('execType'),
      limit: ctx.num('limit'),
    });
    return parseMcpResult(result);
  },
};