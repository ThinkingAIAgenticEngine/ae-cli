import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const updateFlow: Command = {
  service: 'dataops_flow',
  command: '+update_flow',
  description: 'Update task flow basic information (name/description/owner). Write operation requires two-step confirmation: first call returns operation preview (with before/after comparison), confirm by setting confirmed=true to execute update. Only pass in fields that need to be modified, unpassed fields remain unchanged',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'flowName', type: 'string', required: false, desc: 'New name (will not modify if not provided)' },
    { name: 'remark', type: 'string', required: false, desc: 'New description (will not modify if not provided)' },
    { name: 'owner', type: 'string', required: false, desc: 'New owner openId (will not modify if not provided)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_update_flow', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      flowName: ctx.str('flowName'),
      remark: ctx.str('remark'),
      owner: ctx.str('owner'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};