import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_list_sync_solutions';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
  };
}

export const listSyncSolutions: Command = {
  service: 'dataops_integration',
  command: '+list_sync_solutions',
  description: 'List sync solutions in a space. Returns syncId, syncName, source/sink component, datasource, database and table fields, lastExecStatus/lastScheduleStatus codes, owner, remark, and timestamps. Use syncId with +get_sync_detail or +exec_sync_solution',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
