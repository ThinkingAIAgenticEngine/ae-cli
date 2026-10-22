import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/validate`;
}

export const validateRun: Command = {
  service: 'evaluation',
  command: '+validate_run',
  description:
    'Run the same preflight validation as +start_run via POST /agenteval/api/v1/evaluation-runs/{runId}/validate, without starting the run. Sends no request body and needs no lock_version. Returns validation issues (evaluator binding, field mapping, result filter fields, subject connectivity).',
  flags: [...evalFlags(), idFlag('Run UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
