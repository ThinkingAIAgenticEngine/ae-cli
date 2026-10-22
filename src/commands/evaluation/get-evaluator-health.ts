import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/health`;
}

export const getEvaluatorHealth: Command = {
  service: 'evaluation',
  command: '+get_evaluator_health',
  description:
    'Get the warning-only reliability summary of an evaluator via GET /agenteval/api/v1/evaluators/{id}/health (status, parse/provider success rates, score distribution collapse, calibration error count).',
  flags: [...evalFlags(), idFlag('Evaluator UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
