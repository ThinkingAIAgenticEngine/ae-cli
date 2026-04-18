import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getTaskParams: Command = {
  service: 'dataops_flow',
  command: '+get_task_params',
  description: 'Query task node parameter list, returns system parameters and custom parameters. Read-only operation, no two-step confirmation required. Returns: paramKey (parameter key), paramValue (parameter value), paramType (parameter type). Parameters can be referenced in SQL via ${paramKey}. Related tools: repo_list_support_params (view space-level parameters)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Task code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_get_task_params', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      taskCode: ctx.num('taskCode'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};