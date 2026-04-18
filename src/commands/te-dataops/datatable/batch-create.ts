import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const batchCreate: Command = {
  service: 'dataops_datatable',
  command: '+batch_create',
  description: 'Batch create direct connection views. Two modes: Full database sync (batchCreationMode=1, create views for batch tables) and failure retry (batchCreationMode=2, retry previously failed views). Write operation requires two-step confirmation. Executes asynchronously, after returning batchId poll progress via linkview_get_batch_status. processType: 1=DEV only, 2=DEV+PROD. viewName cannot conflict with existing tables/views. Single failure does not affect other views',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'srcRepoCode', type: 'string', required: true, desc: 'Source repository code' },
    { name: 'srcCatalog', type: 'string', required: true, desc: 'Source catalog name' },
    { name: 'srcSchema', type: 'string', required: true, desc: 'Source schema/database name' },
    { name: 'processType', type: 'number', required: true, desc: 'Process type: 1=DEV only, 2=DEV+PROD' },
    { name: 'batchCreationMode', type: 'number', required: true, desc: 'Creation mode: 1=full database sync (batch create), 2=failure retry' },
    { name: 'owner', type: 'string', required: false, desc: 'Owner openId' },
    { name: 'viewInfos', type: 'string', required: true, desc: 'View info JSON array, each item contains {viewName, srcTableName, srcTableType}' },
    { name: 'parentBatchId', type: 'string', required: false, desc: 'Previous batch ID, required for failure retry mode' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Whether confirmed to execute. First call without this parameter or with false for preview, pass true to execute after confirmation' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'linkview_batch_create', {
      spaceCode: ctx.str('spaceCode'),
      srcRepoCode: ctx.str('srcRepoCode'),
      srcCatalog: ctx.str('srcCatalog'),
      srcSchema: ctx.str('srcSchema'),
      processType: ctx.num('processType'),
      batchCreationMode: ctx.num('batchCreationMode'),
      owner: ctx.str('owner'),
      viewInfos: ctx.str('viewInfos'),
      parentBatchId: ctx.str('parentBatchId'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};