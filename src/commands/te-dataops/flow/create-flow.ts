import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_create_flow';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowName: ctx.str('flowName'),
    remark: ctx.str('remark'),
  };
}

export const createFlow: Command = {
  service: 'dataops_flow',
  command: '+create_flow',
  description: 'Create a DEV task flow. Requires spaceCode and flowName; remark is optional. Returns action/result/status; result contains flowCode and flowName. Add task nodes separately, then configure scheduling if needed.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowName', type: 'string', required: true, desc: 'Task flow name' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional flow description' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
