import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_list_sync_runs';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    syncId: ctx.str('syncId'),
    limit: ctx.optionalNum('limit'),
  };
}

export const listSyncRuns: Command = {
  service: 'dataops_integration',
  command: '+list_sync_runs',
  description: 'List manual sync runs of a sync solution, newest first. Returns runs, returnedCount, limit, and nextAction. Each run includes taskId, execType, status, execTime, channelMode, and submitter',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'limit', type: 'number', required: false, desc: 'Number of results to return, defaults to 20 if not provided' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
