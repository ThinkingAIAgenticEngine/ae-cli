import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/versions`;
}

export const listEvaluatorVersions: Command = {
  service: 'evaluation',
  command: '+list_evaluator_versions',
  description:
    'List published versions of an evaluator via GET /agenteval/api/v1/evaluators/{id}/versions. Pin a version id in +select_run_evaluators --evaluator-versions-json; never guess version UUIDs.',
  flags: [...evalFlags(), idFlag('Evaluator UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
