import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  backfillJobFlags,
  buildBackfillJobArgs,
  validateBackfillJobId,
} from './backfill-options.js';

const toolName = 'operations_delete_backfill_job';

export const deleteBackfillJob: Command = {
  service: 'dataops_operations',
  command: '+delete_backfill_job',
  description: 'Delete one backfill job. The server permits deletion only in supported terminal or draft states.',
  flags: backfillJobFlags(),
  risk: 'high-risk-write',
  validate: validateBackfillJobId,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildBackfillJobArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildBackfillJobArgs(ctx)),
};
