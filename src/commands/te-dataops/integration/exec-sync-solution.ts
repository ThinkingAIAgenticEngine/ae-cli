import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_exec_sync_solution';

export const execSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+exec_sync_solution',
  description: 'Submit one manual sync solution run. Optional baseDate maps to execution parameter bd. Returns syncId, taskId, execType, status, execTime, and nextAction. Use +list_sync_runs to check run status',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncId', type: 'string', required: true, desc: 'Sync solution ID' },
    { name: 'baseDate', type: 'string', required: false, desc: 'Optional data date for this manual run, mapped to execution parameter bd, for example 2026-06-20' },
    { name: 'comment', type: 'string', required: false, desc: 'Optional execution remark' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, {
    spaceCode: ctx.str('spaceCode'),
    syncId: ctx.str('syncId'),
    baseDate: ctx.str('baseDate'),
    comment: ctx.str('comment'),
  }),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, {
      spaceCode: ctx.str('spaceCode'),
      syncId: ctx.str('syncId'),
      baseDate: ctx.str('baseDate'),
      comment: ctx.str('comment'),
    });
  },
};
