import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/credentials';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { name: ctx.str('name'), lock_version: ctx.num('lock-version') };
}

export const updateCredential: Command = {
  service: 'evaluation',
  command: '+update_credential',
  description:
    'Rename a credential via PATCH /agenteval/api/v1/credentials/{id}. To replace the secret use +rotate_credential. Requires the current credential lock_version.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Credential UUID', 'credential'),
    { name: 'name', type: 'string', required: true, desc: 'New credential name (1-128 characters)' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
