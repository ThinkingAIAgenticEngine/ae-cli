import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_update_flow';

function requireUpdateField(ctx: RuntimeContext): void {
  if (!ctx.str('flowName').trim() && !ctx.str('remark').trim()) {
    throw new Error('Pass at least one of --flowName or --remark');
  }
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  requireUpdateField(ctx);
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    flowName: ctx.str('flowName'),
    remark: ctx.str('remark'),
  };
}

export const updateFlow: Command = {
  service: 'dataops_flow',
  command: '+update_flow',
  description: 'Update DEV workflow name and/or remark. Requires spaceCode, flowCode, and at least one of flowName or remark. Returns action/result/status; result is an array with flowCode, operationStatus, nameChanged, and optional flowName.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'flowName', type: 'string', required: false, desc: 'Optional new workflow name' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional new workflow remark' },
  ],
  risk: 'write',
  validate: requireUpdateField,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
