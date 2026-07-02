import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'flow_preview_release_flow';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    flowCode: ctx.num('flowCode'),
  };
}

export const previewReleaseFlow: Command = {
  service: 'dataops_flow',
  command: '+preview_release_flow',
  description: 'Preview pending DEV-to-PROD release changes for one task flow without publishing. Requires spaceCode and flowCode. Returns flowCode, releaseStatus, message, and changes with scheduleConfigChange and task diffs. Use before +release_flow.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
