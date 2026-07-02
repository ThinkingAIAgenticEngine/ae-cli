import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_save_sync_solution';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    syncId: ctx.str('syncId'),
    syncName: ctx.str('syncName'),
    sourceConfig: ctx.str('sourceConfig'),
    sinkConfig: ctx.str('sinkConfig'),
    channelConfig: ctx.str('channelConfig'),
    fieldsMapping: ctx.str('fieldsMapping'),
    remark: ctx.str('remark'),
  };
}

export const saveSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+save_sync_solution',
  description: 'Update a sync solution. Requires complete sourceConfig and sinkConfig JSON; not a partial patch. Call +get_sync_detail --withParams true first',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'syncName', type: 'string', required: false, desc: 'New sync solution name' },
    { name: 'sourceConfig', type: 'string', required: true, desc: 'Complete source configuration JSON' },
    { name: 'sinkConfig', type: 'string', required: true, desc: 'Complete sink configuration JSON' },
    { name: 'channelConfig', type: 'string', required: false, desc: 'Complete channel configuration JSON; pass it to keep or update custom channel settings' },
    { name: 'fieldsMapping', type: 'string', required: false, desc: 'Complete field mapping JSON; pass it to keep or update field mappings' },
    { name: 'remark', type: 'string', required: false, desc: 'Updated remark' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
