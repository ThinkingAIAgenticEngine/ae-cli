import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_execute_flow';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
    baseDate: ctx.str('baseDate'),
  };
}

export const executeFlow: Command = {
  service: 'dataops_flow',
  command: '+execute_flow',
  description: 'Trigger one full PROD task flow execution. Requires spaceCode and flowCode; baseDate is optional and maps to runtime parameter bd. Returns action/result/status; result includes flowCode, executeId, operationStatus, nextAction, and optional flowInstanceId.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'baseDate', type: 'string', required: false, desc: 'Optional data date, format yyyy-MM-dd. Maps to runtime parameter bd' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
