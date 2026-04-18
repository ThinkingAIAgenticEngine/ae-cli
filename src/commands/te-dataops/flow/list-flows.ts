import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listFlows: Command = {
  service: 'dataops_flow',
  command: '+list_flows',
  description: 'Search/list task flows under a space, supports fuzzy search by task flow name. Returns: flowCode (task flow code), flowName (name), status (status), owner (owner). This is the entry tool for task flow management, after getting flowCode can call other flow_* tools. Not passing keyword returns all task flows. Related tools: flow_get_flow_detail, flow_get_flow_dag, flow_list_flow_instances',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'keyword', type: 'string', required: false, desc: 'Search keyword (task flow name fuzzy match)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_list_flows', {
      spaceCode: ctx.str('spaceCode'),
      keyword: ctx.str('keyword'),
    });
    return parseMcpResult(result);
  },
};