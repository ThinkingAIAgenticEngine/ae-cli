import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getFlowDetail: Command = {
  service: 'dataops_flow',
  command: '+get_flow_detail',
  description: 'Get task flow basic information, including name, status, owner, schedule status, creation/modification time. Returns: flowCode, flowName, status, owner, scheduled, createTime, updateTime. Requires flowCode (can be obtained via flow_list_flows). Related tools: flow_get_flow_dag, flow_get_schedule_config',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code (can be obtained via flow_list_flows)' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_get_flow_detail', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};