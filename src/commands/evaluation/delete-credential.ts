import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/credentials';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteCredential: Command = {
  service: 'evaluation',
  command: '+delete_credential',
  description:
    'Delete a credential via DELETE /agenteval/api/v1/credentials/{id}. Model configs and agents still referencing it will fail until rebound. Requires the current credential lock_version.',
  flags: [...evalFlags(), ...idAndLockFlags('Credential UUID', 'credential')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
