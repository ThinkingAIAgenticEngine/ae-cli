import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listParamUsedFlows: Command = {
  service: 'dataops_repo',
  command: '+list_param_used_flows',
  description: 'Query which workflows reference specified space parameter, returns list of workflows referencing that parameter. Applicable for impact assessment before parameter changes',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'paramKey', type: 'string', required: true, desc: 'Parameter key name' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_list_param_used_flows', {
      spaceCode: ctx.str('spaceCode'),
      paramKey: ctx.str('paramKey'),
    });
    return parseMcpResult(result);
  },
};