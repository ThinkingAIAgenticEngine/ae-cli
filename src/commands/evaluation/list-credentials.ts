import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/credentials';

export const listCredentials: Command = {
  service: 'evaluation',
  command: '+list_credentials',
  description:
    'List platform credentials via GET /agenteval/api/v1/credentials. Secrets are never returned; use +get_credential for one entry. Requires ADMIN role.',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH),
};
