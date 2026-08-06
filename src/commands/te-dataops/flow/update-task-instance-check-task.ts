import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  updateTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';
import { buildCheckArgs, validateCheckArgs } from './workflow-instance-check-task-options.js';

const toolName = 'flow_update_task_instance_check_task';

function buildArgs(ctx: Parameters<NonNullable<Command['execute']>>[0]) {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskCode: ctx.num('taskCode'),
    ...buildCheckArgs(ctx),
    ...buildTaskWriteArgs(ctx),
  };
}

export const updateTaskInstanceCheckTask: Command = {
  service: 'dataops_flow',
  command: '+update_task_instance_check_task',
  description: 'Replace the check configuration of an existing DEV task instance check node. Omitted dependencies, check scalars, and retry fields keep existing values',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Flow code containing the TASK_CHECK node to update' },
    { name: 'taskCode', type: 'number', required: true, desc: 'TASK_CHECK node code to update; this is not a target task code from checkItems' },
    { name: 'checkItems', type: 'json', required: true, desc: 'Replacement JSON array of 1-20 target tasks. Each object allows only flowCode, taskCode, left, right, and checkTimeUnit (DAY, HOUR, or MINUTE); nested taskCode identifies the target task' },
    { name: 'relation', type: 'string', required: false, desc: 'Flat relation across all check items: AND or OR. Omit to keep the existing relation' },
    { name: 'checkInterval', type: 'number', required: false, min: 1, max: 180, desc: 'Check interval in minutes. Omit to keep the existing value' },
    { name: 'checkTime', type: 'number', required: false, min: 1, max: 20, desc: 'Number of checks. Omit to keep the existing value' },
    ...updateTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateCheckArgs(ctx, true);
    validateTaskWriteArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
