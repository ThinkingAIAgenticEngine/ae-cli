import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  backfillJobFlags,
  buildBackfillJobArgs,
  validateBackfillJobId,
} from './backfill-options.js';

const toolName = 'operations_rerun_backfill_job';

export const rerunBackfillJob: Command = {
  service: 'dataops_operations',
  command: '+rerun_backfill_job',
  description: 'Rerun every plan in an existing terminal backfill job. This reuses the job and does not rerun only failed plans.',
  flags: backfillJobFlags(),
  risk: 'write',
  validate: validateBackfillJobId,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildBackfillJobArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildBackfillJobArgs(ctx)),
};
