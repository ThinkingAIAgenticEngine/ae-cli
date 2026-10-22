import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/credentials';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/rotate`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { secret: ctx.str('secret'), lock_version: ctx.num('lock-version') };
}

export const rotateCredential: Command = {
  service: 'evaluation',
  command: '+rotate_credential',
  description:
    'Replace the secret of a credential via POST /agenteval/api/v1/credentials/{id}/rotate. Model configs and agents referencing it pick up the new secret on their next call. Requires the current credential lock_version.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Credential UUID', 'credential'),
    {
      name: 'secret',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'New secret value (max 8192 chars); sent once to the current AE Host and never returned by the platform',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, { secret: '***redacted***', lock_version: ctx.num('lock-version') }),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
