import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/overview`;
}

export const runOverview: Command = {
  service: 'evaluation',
  command: '+run_overview',
  description:
    'Get an evaluation run overview via GET /agenteval/api/v1/evaluation-runs/{runId}/overview: progress, average score, pass rate, score distribution, and result fields.',
  flags: [...evalFlags(), idFlag('Run UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
