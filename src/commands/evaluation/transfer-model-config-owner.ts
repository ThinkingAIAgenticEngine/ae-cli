import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/model-configs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/transfer-owner`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { owner_user_id: ctx.str('owner-user-id'), lock_version: ctx.num('lock-version') };
}

export const transferModelConfigOwner: Command = {
  service: 'evaluation',
  command: '+transfer_model_config_owner',
  description:
    'Transfer model config ownership to another user via POST /agenteval/api/v1/model-configs/{id}/transfer-owner. Changes resource permissions; requires ADMIN role and the current model config lock_version.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Model config UUID', 'model config'),
    { name: 'owner-user-id', type: 'string', required: true, desc: 'User UUID of the new owner' },
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
