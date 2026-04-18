import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getBatchStatus: Command = {
  service: 'dataops_datatable',
  command: '+get_batch_status',
  description: 'Query status of batch creation task and details of each view. Returns: batchId, status (WAIT/RUNNING/SUCCESS/STOP), totalCount, completedCount, failedCount, duration, details (each view: viewName, srcTableName, status, errorMessage). Async task, recommend polling every 3-5 seconds, task ends when status is SUCCESS or STOP',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'batchId', type: 'string', required: true, desc: 'Batch ID' },
    { name: 'detailStatus', type: 'string', required: false, desc: 'Filter by detail status: 1=waiting, 2=creating, 3=success, 4=failed' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'linkview_get_batch_status', {
      spaceCode: ctx.str('spaceCode'),
      batchId: ctx.str('batchId'),
      detailStatus: ctx.str('detailStatus'),
    });
    return parseMcpResult(result);
  },
};