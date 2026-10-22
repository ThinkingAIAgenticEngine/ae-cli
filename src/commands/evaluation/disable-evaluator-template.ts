import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluator-templates';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const disableEvaluatorTemplate: Command = {
  service: 'evaluation',
  command: '+disable_evaluator_template',
  description:
    'Disable an evaluator template via DELETE /agenteval/api/v1/evaluator-templates/{id}. Disabled templates can no longer be referenced when creating evaluators. Requires ADMIN role.',
  flags: [...evalFlags(), idFlag('Evaluator template UUID')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx)),
};
