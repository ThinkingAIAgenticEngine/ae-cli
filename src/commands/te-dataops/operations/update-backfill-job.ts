import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';
import { validateBackfillJobId } from './backfill-options.js';
import {
  backfillDraftFlags,
  buildBackfillDraftArgs,
  validateBackfillDraft,
} from './create-backfill-job.js';

const toolName = 'operations_update_backfill_job';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    ...buildBackfillDraftArgs(ctx),
    jobId: ctx.num('jobId'),
  };
}

function validateUpdate(ctx: RuntimeContext): void {
  validateBackfillJobId(ctx);
  validateBackfillDraft(ctx);
}

const [spaceCodeFlag, ...draftFlags] = backfillDraftFlags();

export const updateBackfillJob: Command = {
  service: 'dataops_operations',
  command: '+update_backfill_job',
  description: 'Replace the complete configuration of a DRAFT backfill job. This does not start the job.',
  flags: [
    spaceCodeFlag,
    { name: 'jobId', type: 'number', required: true, desc: 'DRAFT backfill job ID' },
    ...draftFlags,
  ],
  risk: 'write',
  validate: validateUpdate,
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
