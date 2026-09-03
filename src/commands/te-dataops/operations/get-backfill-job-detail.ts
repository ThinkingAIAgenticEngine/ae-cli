import type { Command } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import {
  backfillJobFlags,
  buildBackfillJobArgs,
  validateBackfillJobId,
} from './backfill-options.js';

const toolName = 'operations_get_backfill_job_detail';

export const getBackfillJobDetail: Command = {
  service: 'dataops_operations',
  command: '+get_backfill_job_detail',
  description: 'Get one backfill job and its plans. A DRAFT job has an empty plans list because it has not run yet.',
  flags: backfillJobFlags(),
  risk: 'read',
  validate: validateBackfillJobId,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildBackfillJobArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildBackfillJobArgs(ctx)),
};
