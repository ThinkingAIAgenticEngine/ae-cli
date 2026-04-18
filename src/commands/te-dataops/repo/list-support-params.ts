import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listSupportParams: Command = {
  service: 'dataops_repo',
  command: '+list_support_params',
  description: 'List all parameters supported by space (built-in + custom), returns unified parameter list. Returns: paramKey (parameter key), paramValue (parameter value), remark (description), origin (source: BUILTIN=built-in/CUSTOM=custom). Built-in parameter examples: ws_run_date (run date), ws_run_date_offset_1 (previous day date), etc. Built-in parameters cannot be modified. Applicable for viewing available parameters when writing scripts or tasks',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'repo_list_support_params', {
      spaceCode: ctx.str('spaceCode'),
    });
    return parseMcpResult(result);
  },
};