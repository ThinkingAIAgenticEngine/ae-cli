import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/retry-failed-cases`;
}

export const retryFailedRunCases: Command = {
  service: 'evaluation',
  command: '+retry_failed_run_cases',
  description:
    'Requeue Agent-stage FAILED, BLOCKED and UNKNOWN cases of a run via POST /agenteval/api/v1/evaluation-runs/{id}/retry-failed-cases. Sends {lock_version}. Successful cases are preserved; the immutable run snapshot is reused, the execution epoch increases and aggregates are recomputed.',
  flags: [...evalFlags(), ...idAndLockFlags('Run UUID', 'run')],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
};
