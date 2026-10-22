import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/credentials';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getCredential: Command = {
  service: 'evaluation',
  command: '+get_credential',
  description:
    'Get one credential by UUID via GET /agenteval/api/v1/credentials/{id}. The secret value is never returned. Requires ADMIN role.',
  flags: [...evalFlags(), idFlag('Credential UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
