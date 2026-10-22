import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteEvaluator: Command = {
  service: 'evaluation',
  command: '+delete_evaluator',
  description:
    'Delete an evaluator via DELETE /agenteval/api/v1/evaluators/{id}. Runs that already bound it keep their frozen snapshot. Requires the current evaluator lock_version.',
  flags: [...evalFlags(), ...idAndLockFlags('Evaluator UUID', 'evaluator')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
