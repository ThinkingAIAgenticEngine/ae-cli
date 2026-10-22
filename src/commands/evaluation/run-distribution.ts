import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/distribution`;
}

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const runEvaluatorId = ctx.str('run-evaluator-id');
  if (runEvaluatorId) params.run_evaluator_id = runEvaluatorId;
  return params;
}

export const runDistribution: Command = {
  service: 'evaluation',
  command: '+run_distribution',
  description:
    'Get the five fixed score buckets of a run via GET /agenteval/api/v1/evaluation-runs/{id}/distribution. Pass --run-evaluator-id to scope the buckets to one run evaluator binding.',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
    { name: 'run-evaluator-id', type: 'string', desc: 'Run evaluator UUID to scope the distribution to' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx), buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx), buildParams(ctx)),
};
