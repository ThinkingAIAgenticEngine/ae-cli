import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_save_schedule_config';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    enabled: ctx.bool('enabled'),
    cron: ctx.str('cron'),
  };
}

export const saveScheduleConfig: Command = {
  service: 'dataops_flow',
  command: '+save_schedule_config',
  description: 'Save DEV flow schedule config. Requires spaceCode, flowCode, and enabled. cron is required only when enabled=true; enabled=false disables scheduling. Returns action/result/status; result includes enabled, flow, message, and cron when enabled=true. Release the flow to apply changes in PROD',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'Whether scheduling is enabled: true or false' },
    { name: 'cron', type: 'string', required: false, desc: 'Quartz CRON expression. Required only when enabled=true, e.g., \'0 0 2 * * ?\'' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
