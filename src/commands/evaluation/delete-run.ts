import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteRun: Command = {
  service: 'evaluation',
  command: '+delete_run',
  description:
    'Delete a draft evaluation run via DELETE /agenteval/api/v1/evaluation-runs/{runId}. Only DRAFT runs can be deleted; requires the current lock_version.',
  flags: [...evalFlags(), ...idAndLockFlags('Run UUID', 'run')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
