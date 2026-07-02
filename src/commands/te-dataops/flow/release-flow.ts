import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_release_flow';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
  };
}

export const releaseFlow: Command = {
  service: 'dataops_flow',
  command: '+release_flow',
  description: 'Submit one DEV-to-PROD task flow release. Requires spaceCode and flowCode. Returns action/result/status; result includes flowCode, releaseStatus, message, optional packageCode, and optional changes with scheduleConfigChange and task changed items. Preview with +preview_release_flow first.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
