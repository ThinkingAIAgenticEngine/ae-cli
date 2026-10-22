import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/start`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const startRun: Command = {
  service: 'evaluation',
  command: '+start_run',
  description:
    'Start an evaluation run via POST /agenteval/api/v1/evaluation-runs/{runId}/start. Runs an agent compatibility preflight, then atomically freezes snapshots and queues the run. Requires the current lock_version from +get_run.',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
    {
      name: 'lock-version',
      type: 'number',
      required: true,
      min: 0,
      desc: 'Current run lock_version (optimistic lock), from +get_run',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
