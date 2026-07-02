import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_stop_sync_solution';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    syncId: ctx.str('syncId'),
    taskId: ctx.str('taskId'),
  };
}

export const stopSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+stop_sync_solution',
  description: 'Stop a running manual sync task. Requires spaceCode, syncId, and taskId. Use taskId from +list_sync_runs for an active run. Returns action, result, and status',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'taskId', type: 'string', required: true, desc: 'Running execution task ID from +list_sync_runs' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
