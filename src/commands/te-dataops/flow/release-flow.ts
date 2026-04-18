import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const releaseFlow: Command = {
  service: 'dataops_flow',
  command: '+release_flow',
  description: 'Release a task flow, syncing task flow definition from DEV environment to PROD environment. Write operation requires two-step confirmation. After release, PROD scheduling takes effect immediately. It will not interrupt currently running instances, next schedule will use the new version. Returns: flowCode, flowName, releaseId, releaseStatus, message, changes(summary of added/modified/deleted task nodes). Related tools: flow_execute_flow (verify in DEV before publishing), flow_list_flow_instances (view PROD execution), flow_offline_flow (paired: offline stops scheduling, release starts scheduling)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_release_flow', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};