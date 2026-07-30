import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  buildTaskWriteArgs,
  updateTaskWriteFlags,
  validateTaskWriteArgs,
} from './task-write-options.js';

const toolName = 'flow_update_integration_task';

function validateInteger(ctx: RuntimeContext, name: string): void {
  const value = ctx.str(name).trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid --${name}: expected an integer, got "${value}"`);
  }
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskCode: ctx.num('taskCode'),
    syncId: ctx.str('syncId'),
    ...buildTaskWriteArgs(ctx),
  };
}

export const updateIntegrationTask: Command = {
  service: 'dataops_flow',
  command: '+update_integration_task',
  description: 'Update an existing DEV integration sync task to bind a DataOps sync solution. The task must be taskType=OFFLINE_SYNC. Omitted dependencies and retry fields keep existing values',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Integration task code' },
    { name: 'syncId', type: 'string', required: true, desc: 'DataOps sync solution ID to bind' },
    ...updateTaskWriteFlags,
  ],
  risk: 'write',
  validate: (ctx) => {
    validateInteger(ctx, 'flowCode');
    validateInteger(ctx, 'taskCode');
    validateTaskWriteArgs(ctx);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
