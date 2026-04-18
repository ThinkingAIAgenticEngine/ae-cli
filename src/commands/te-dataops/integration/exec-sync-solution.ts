import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const execSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+exec_sync_solution',
  description: 'Manually execute a sync solution. Write operation requires two-step confirmation: first call returns operation preview, confirm by setting confirmed=true to execute. Suggest confirming solution configuration is correct via integration_get_sync_detail before execution. Can pass execution parameters via execParams (e.g., date range, parameter list can be obtained via integration_get_sync_params). Can view execution records via integration_list_sync_exec_histories after execution',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'execParams', type: 'string', required: false, desc: 'Execution parameters JSON string' },
    { name: 'comment', type: 'string', required: false, desc: 'Execution remark' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_exec_sync_solution', {
      spaceCode: ctx.str('spaceCode'),
      syncId: ctx.str('syncId'),
      execParams: ctx.str('execParams'),
      comment: ctx.str('comment'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};