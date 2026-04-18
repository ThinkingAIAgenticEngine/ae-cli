import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listBatches: Command = {
  service: 'dataops_datatable',
  command: '+list_batches',
  description: 'List historical batch creation task records. Returns: batchId, owner, createTime, finishedTime, duration, srcRepoCode, srcCatalog, srcSchema, totalCount, completedCount, failedCount, status',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'status', type: 'string', required: false, desc: 'Filter by status: 1=waiting, 2=running, 3=success, 4=stopped' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'linkview_list_batches', {
      spaceCode: ctx.str('spaceCode'),
      status: ctx.str('status'),
    });
    return parseMcpResult(result);
  },
};