import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_add_task_relation';

function buildArgs(ctx: Parameters<NonNullable<Command['execute']>>[0]) {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    preTaskCode: ctx.num('preTaskCode'),
    taskCode: ctx.num('taskCode'),
  };
}

export const addTaskRelation: Command = {
  service: 'dataops_flow',
  command: '+add_task_relation',
  description: 'Add a DEV dependency from preTaskCode (upstream) to taskCode (downstream). Requires spaceCode, flowCode, preTaskCode, and taskCode. Returns action/result/status; result includes status, flowCode, preTaskCode, taskCode, and message',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'preTaskCode', type: 'number', required: true, desc: 'Pre-task code (upstream)' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Current task code (downstream)' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
