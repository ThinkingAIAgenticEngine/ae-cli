import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const saveScheduleConfig: Command = {
  service: 'dataops_flow',
  command: '+save_schedule_config',
  description: 'Save task flow schedule configuration. Write operation requires two-step confirmation. scheduled: 1(enabled), 0(off). scheduleType: CRON(cron expression-based, needs cron parameter) or INTERVAL (fixed interval). cron example: \'0 0 2 * * ?\' represents daily at 2 AM. Related tools: flow_get_schedule_config',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'scheduled', type: 'number', required: true, desc: 'Enable schedule: 1 (enabled) or 0 (disabled)' },
    { name: 'scheduleType', type: 'string', required: false, desc: 'Schedule type: CRON (cron expression-based, needs cron parameter) or INTERVAL (fixed interval)' },
    { name: 'cron', type: 'string', required: false, desc: 'Cron expression (required when scheduleType=CRON, e.g., \'0 0 2 * * ?\' represents daily at 2 AM)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_save_schedule_config', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      scheduled: ctx.num('scheduled'),
      scheduleType: ctx.str('scheduleType'),
      cron: ctx.str('cron'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};