import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  updateTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';
import { buildCheckArgs, validateCheckArgs } from './workflow-instance-check-task-options.js';

const toolName = 'flow_update_workflow_instance_check_task';

function buildArgs(ctx: Parameters<NonNullable<Command['execute']>>[0]) {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskCode: ctx.num('taskCode'),
    ...buildCheckArgs(ctx),
    ...buildTaskWriteArgs(ctx),
  };
}

export const updateWorkflowInstanceCheckTask: Command = {
  service: 'dataops_flow',
  command: '+update_workflow_instance_check_task',
  description: 'Replace the check configuration of an existing DEV workflow instance check task. Omitted dependencies and retry fields keep existing values',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Workflow instance check task code' },
    { name: 'checkItems', type: 'json', required: true, desc: 'JSON array of 1-20 objects with only flowCode, left, right, and checkTimeUnit (DAY, HOUR, or MINUTE)' },
    { name: 'relation', type: 'string', required: false, desc: 'Flat relation across all check items: AND or OR. Omit to keep the existing relation' },
    { name: 'checkInterval', type: 'number', required: false, min: 1, max: 180, desc: 'Check interval in minutes. Omit to keep the existing value' },
    { name: 'checkTime', type: 'number', required: false, min: 1, max: 20, desc: 'Number of checks. Omit to keep the existing value' },
    ...updateTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateCheckArgs(ctx);
    validateTaskWriteArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
