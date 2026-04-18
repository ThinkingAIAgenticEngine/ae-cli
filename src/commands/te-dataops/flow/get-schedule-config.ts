import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getScheduleConfig: Command = {
  service: 'dataops_flow',
  command: '+get_schedule_config',
  description: 'Get schedule configuration information of a task flow. Returns: scheduled (whether scheduled), scheduleType (schedule type: CRON/INTERVAL), cron (cron expression), startTime/endTime (validity period). Related tools: flow_save_schedule_config',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code (can be obtained via flow_list_flows)' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (development environment, default), PROD (production environment)' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_get_schedule_config', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      env: ctx.str('env'),
    });
    return parseMcpResult(result);
  },
};