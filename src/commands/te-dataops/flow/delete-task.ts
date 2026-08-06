import type { Command, RuntimeContext } from '../../../framework/types.js';
import { CliValidationError } from '../../../core/errors.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_delete_task';

function validateIdentifier(ctx: RuntimeContext, name: 'flowCode' | 'taskCode'): void {
  const raw = ctx.str(name).trim();
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new CliValidationError(`--${name} must be a positive safe integer`, {
      location: { field: name },
    });
  }
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    taskCode: ctx.num('taskCode'),
  };
}

export const deleteTask: Command = {
  service: 'dataops_flow',
  command: '+delete_task',
  description: 'Delete one task node from a DEV flow. This disconnects its dependencies, may stop running DEV debug executions, does not repair cross-flow task-check references, and requires a later flow release to remove an already published PROD node.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code containing the node' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Task node code to delete' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => {
    validateIdentifier(ctx, 'flowCode');
    validateIdentifier(ctx, 'taskCode');
  },
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
