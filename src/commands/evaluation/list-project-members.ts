import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/projects/members';

export const listProjectMembers: Command = {
  service: 'evaluation',
  command: '+list_project_members',
  description:
    'List project members via GET /agenteval/api/v1/projects/members. Requires ADMIN role. Includes external_id, login status and root | agent_admin | member role. Use the returned user UUIDs as --owner-user-id for +transfer_run_owner and other transfer commands.',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH),
};
