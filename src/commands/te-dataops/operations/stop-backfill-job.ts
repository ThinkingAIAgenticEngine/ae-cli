import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  backfillJobFlags,
  buildBackfillJobArgs,
  validateBackfillJobId,
} from './backfill-options.js';

const toolName = 'operations_stop_backfill_job';

export const stopBackfillJob: Command = {
  service: 'dataops_operations',
  command: '+stop_backfill_job',
  description: 'Stop a RUNNING backfill job and its unfinished plans. This is a high-impact operation and requires confirmation.',
  flags: backfillJobFlags(),
  risk: 'high-risk-write',
  validate: validateBackfillJobId,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildBackfillJobArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildBackfillJobArgs(ctx)),
};
