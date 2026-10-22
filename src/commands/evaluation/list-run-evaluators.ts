import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/evaluators`;
}

export const listRunEvaluators: Command = {
  service: 'evaluation',
  command: '+list_run_evaluators',
  description:
    'List the evaluators bound to a run via GET /agenteval/api/v1/evaluation-runs/{runId}/evaluators, including per-evaluator progress and score counts. Bind or replace them with +select_run_evaluators.',
  flags: [...evalFlags(), idFlag('Run UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
