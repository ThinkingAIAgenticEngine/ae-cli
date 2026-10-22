import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getEvaluator: Command = {
  service: 'evaluation',
  command: '+get_evaluator',
  description:
    'Get one evaluator by id via GET /agenteval/api/v1/evaluators/{evaluatorId}.',
  flags: [...evalFlags(), idFlag('Evaluator UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
