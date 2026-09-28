import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_get_task_params';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskCode: ctx.num('taskCode'),
  };
}

export const getTaskParams: Command = {
  service: 'dataops_flow',
  command: '+get_task_params',
  description: 'Query DEV task parameters. Requires spaceCode, flowCode, and taskCode. Returns an array; items include paramKey, paramType, paramDataType, paramFrom, and built-in flags like isBd',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Task code' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
