import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSyncSolutions: Command = {
  service: 'dataops_integration',
  command: '+list_sync_solutions',
  description: 'List all sync solutions under a space. Returns: syncId (sync solution ID, for subsequent Tool calls), syncName (name), srcComponent/sinkComponent (source/target components), srcDatasourceId/sinkDatasourceId (source/target datasource IDs), lastExecStatus (last execution status: WAITING/RUNNING/SUCCESS/FAIL/STOP), owner (owner). This is the entry point for sync solution management, after getting syncId can call integration_get_sync_detail to view details, integration_exec_sync_solution to execute sync',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_list_sync_solutions', {
      spaceCode: ctx.str('spaceCode'),
    });
    return parseMcpResult(result);
  },
};