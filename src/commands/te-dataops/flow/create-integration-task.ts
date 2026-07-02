import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_create_integration_task';

function validateInteger(ctx: RuntimeContext, name: string, required = true): void {
  const value = ctx.str(name).trim();
  if (!value && !required) return;
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid --${name}: expected an integer, got "${value}"`);
  }
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskName: ctx.str('taskName'),
    syncId: ctx.str('syncId'),
    preTaskCode: ctx.optionalNum('preTaskCode'),
    remark: ctx.str('remark'),
  };
}

export const createIntegrationTask: Command = {
  service: 'dataops_flow',
  command: '+create_integration_task',
  description: 'Create a DEV integration sync task node bound to an existing DataOps sync solution. Use dataops_integration +list_sync_solutions or +get_sync_detail to find syncId. Returns action, result, and status; result includes syncTaskSaved, flowCode, taskCode, taskName, taskType=OFFLINE_SYNC, syncId, and nextAction',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskName', type: 'string', required: true, desc: 'Task name' },
    { name: 'syncId', type: 'string', required: true, desc: 'DataOps sync solution ID to bind' },
    { name: 'preTaskCode', type: 'number', required: false, desc: 'Pre-task code (upstream dependency)' },
    { name: 'remark', type: 'string', required: false, desc: 'Description' },
  ],
  risk: 'write',
  validate: (ctx) => {
    validateInteger(ctx, 'flowCode');
    validateInteger(ctx, 'preTaskCode', false);
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
