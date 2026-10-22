import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/transfer-owner`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { owner_user_id: ctx.str('owner-user-id'), lock_version: ctx.num('lock-version') };
}

export const transferRunOwner: Command = {
  service: 'evaluation',
  command: '+transfer_run_owner',
  description:
    'Transfer evaluation run ownership to another user via POST /agenteval/api/v1/evaluation-runs/{id}/transfer-owner. Changes resource permissions; requires ADMIN role and the current run lock_version. Use +list_project_members to discover real user UUIDs.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Run UUID', 'run'),
    { name: 'owner-user-id', type: 'string', required: true, desc: 'User UUID of the new owner' },
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
