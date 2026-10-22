import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getRun: Command = {
  service: 'evaluation',
  command: '+get_run',
  description:
    'Get one evaluation run by id via GET /agenteval/api/v1/evaluation-runs/{runId}, including its frozen snapshot summary.',
  flags: [...evalFlags(), idFlag('Run UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
