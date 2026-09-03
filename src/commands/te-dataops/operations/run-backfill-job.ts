import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  backfillJobFlags,
  buildBackfillJobArgs,
  validateBackfillJobId,
} from './backfill-options.js';

const toolName = 'operations_run_backfill_job';

export const runBackfillJob: Command = {
  service: 'dataops_operations',
  command: '+run_backfill_job',
  description: 'Run an existing DRAFT backfill job. This is separate from creation and generates the job plans on the server.',
  flags: backfillJobFlags(),
  risk: 'write',
  validate: validateBackfillJobId,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildBackfillJobArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildBackfillJobArgs(ctx)),
};
