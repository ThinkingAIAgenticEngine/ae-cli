import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const saveSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+save_sync_solution',
  description: 'Update sync solution configuration. Write operation requires two-step confirmation: first call returns operation preview, confirm by setting confirmed=true to execute update. Requires syncId (can be obtained via integration_list_sync_solutions). Supports modifying solution name, source/sink configurations, channel configuration, field mapping, remark, etc. Only pass in fields that need modification, unpassed fields remain unchanged. Suggest viewing current configuration via integration_get_sync_detail before modification',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'syncName', type: 'string', required: false, desc: 'New solution name (will not modify if not provided)' },
    { name: 'sourceConfig', type: 'string', required: false, desc: 'New source configuration JSON (will not modify if not provided)' },
    { name: 'sinkConfig', type: 'string', required: false, desc: 'New sink configuration JSON (will not modify if not provided)' },
    { name: 'channelConfig', type: 'string', required: false, desc: 'New channel configuration JSON (will not modify if not provided)' },
    { name: 'fieldsMapping', type: 'string', required: false, desc: 'New field mapping JSON (will not modify if not provided)' },
    { name: 'remark', type: 'string', required: false, desc: 'New remark (will not modify if not provided)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_save_sync_solution', {
      spaceCode: ctx.str('spaceCode'),
      syncId: ctx.str('syncId'),
      syncName: ctx.str('syncName'),
      sourceConfig: ctx.str('sourceConfig'),
      sinkConfig: ctx.str('sinkConfig'),
      channelConfig: ctx.str('channelConfig'),
      fieldsMapping: ctx.str('fieldsMapping'),
      remark: ctx.str('remark'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};