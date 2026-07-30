import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  createTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';
import { buildCheckArgs, validateCheckArgs } from './workflow-instance-check-task-options.js';

const toolName = 'flow_create_workflow_instance_check_task';

function buildArgs(ctx: Parameters<NonNullable<Command['execute']>>[0]) {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskName: ctx.str('taskName'),
    remark: ctx.str('remark'),
    ...buildCheckArgs(ctx),
    ...buildTaskWriteArgs(ctx),
  };
}

export const createWorkflowInstanceCheckTask: Command = {
  service: 'dataops_flow',
  command: '+create_workflow_instance_check_task',
  description: 'Create a DEV workflow instance check task. It waits for one or more target workflows using one flat AND/OR relation',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskName', type: 'string', required: true, desc: 'Task name' },
    { name: 'checkItems', type: 'json', required: true, desc: 'JSON array of 1-20 objects with only flowCode, left, right, and checkTimeUnit (DAY, HOUR, or MINUTE)' },
    { name: 'relation', type: 'string', required: false, default: 'AND', desc: 'Flat relation across all check items: AND or OR. Default AND' },
    { name: 'checkInterval', type: 'number', required: false, default: 5, min: 1, max: 180, desc: 'Check interval in minutes. Default 5' },
    { name: 'checkTime', type: 'number', required: false, default: 3, min: 1, max: 20, desc: 'Number of checks. Default 3' },
    { name: 'remark', type: 'string', required: false, desc: 'Description' },
    ...createTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateCheckArgs(ctx);
    validateTaskWriteArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
