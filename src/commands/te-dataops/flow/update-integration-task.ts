import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

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
  };
}

export const updateIntegrationTask: Command = {
  service: 'dataops_flow',
  command: '+update_integration_task',
  description: 'Update an existing DEV integration sync task to bind a DataOps sync solution. The task must be taskType=OFFLINE_SYNC. Preserves task name, dependencies, retry policy, timeout, and other task configuration',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Integration task code' },
    { name: 'syncId', type: 'string', required: true, desc: 'DataOps sync solution ID to bind' },
  ],
  risk: 'write',
  validate: (ctx) => {
    validateInteger(ctx, 'flowCode');
    validateInteger(ctx, 'taskCode');
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
