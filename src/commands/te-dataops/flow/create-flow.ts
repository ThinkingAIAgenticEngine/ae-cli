import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const createFlow: Command = {
  service: 'dataops_flow',
  command: '+create_flow',
  description: 'Create a task flow. Write operation requires two-step confirmation: first call (confirmed not provided or false) returns operation preview, confirm by setting confirmed=true to execute creation. Returns: flowCode, flowName, status. After creation, you add task nodes via flow_create_task, configure scheduling via flow_save_schedule_config',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowName', type: 'string', required: true, desc: 'Task flow name' },
    { name: 'remark', type: 'string', required: false, desc: 'Description' },
    { name: 'owner', type: 'string', required: false, desc: 'Owner openId' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_create_flow', {
      spaceCode: ctx.str('spaceCode'),
      flowName: ctx.str('flowName'),
      remark: ctx.str('remark'),
      owner: ctx.str('owner'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};