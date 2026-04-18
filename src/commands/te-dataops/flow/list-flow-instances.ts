import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listFlowInstances: Command = {
  service: 'dataops_flow',
  command: '+list_flow_instances',
  description: 'Query the list of running instances of a task flow, arranged in reverse chronological order of execution time. Defaults to querying production environment (PROD), returns the most recent 30 records. Returns: executeId, status, startTime, endTime, triggerType. Note: This tool defaults to PROD environment (unlike most tools which default to DEV). executeId can be used for flow_get_execute_record, flow_get_execute_dag, flow_stop_flow. Difference from operations_search_flow_instances: The two use different ID systems (executeId vs flowInstanceId), cannot be interchanged',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment), PROD (production environment, default). Defaults to PROD when querying instance list' },
    { name: 'size', type: 'number', required: false, desc: 'Number of results to return, defaults to 30 if not provided' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_list_flow_instances', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      env: ctx.str('env'),
      size: ctx.num('size'),
    });
    return parseMcpResult(result);
  },
};