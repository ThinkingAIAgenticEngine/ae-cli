import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/versions`;
}

export const publishEvaluatorVersion: Command = {
  service: 'evaluation',
  command: '+publish_evaluator_version',
  description:
    'Publish an immutable evaluator version via POST /agenteval/api/v1/evaluators/{id}/versions. Sends {lock_version}. Publishing without changes returns ASSET_VERSION_NO_CHANGES. Published versions can never be overwritten; runs pin them.',
  flags: [...evalFlags(), ...idAndLockFlags('Evaluator UUID', 'evaluator')],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
};
