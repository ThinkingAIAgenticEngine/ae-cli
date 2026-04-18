import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getSyncDetail: Command = {
  service: 'dataops_integration',
  command: '+get_sync_detail',
  description: 'Get sync solution details, including source/target configuration, field mappings, channel configuration. Returns: syncName (name), srcComponent/sinkComponent (components), sourceConfig/sinkConfig (configurations), fieldsMapping (field mappings), channelConfig (channel configuration). Requires syncId (can be obtained via integration_list_sync_solutions). Optional withParams=true to also return parameter information. Suitable for viewing complete sync solution configuration, confirming configuration is correct before execution',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'withParams', type: 'boolean', required: false, desc: 'Whether to also return parameter information' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_get_sync_detail', {
      spaceCode: ctx.str('spaceCode'),
      syncId: ctx.str('syncId'),
      withParams: ctx.bool('withParams'),
    });
    return parseMcpResult(result);
  },
};