import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_get_sync_detail';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    syncId: ctx.str('syncId'),
    withParams: ctx.bool('withParams'),
  };
}

export const getSyncDetail: Command = {
  service: 'dataops_integration',
  command: '+get_sync_detail',
  description: 'Get sync solution detail: source, sink, field mapping, last status, owner, and nextAction. Optional withParams=true also returns usedParams',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'withParams', type: 'boolean', required: false, desc: 'Also return usedParams; defaults to false' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
