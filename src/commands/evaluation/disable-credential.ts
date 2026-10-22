import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/credentials';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/disable`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const disableCredential: Command = {
  service: 'evaluation',
  command: '+disable_credential',
  description:
    'Disable a credential via POST /agenteval/api/v1/credentials/{id}/disable. Disabled credentials fail connectivity and are rejected for new bindings. Requires the current credential lock_version.',
  flags: [...evalFlags(), ...idAndLockFlags('Credential UUID', 'credential')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
