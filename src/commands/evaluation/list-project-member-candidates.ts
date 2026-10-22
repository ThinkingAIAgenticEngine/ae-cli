import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/projects/members/candidates';

export const listProjectMemberCandidates: Command = {
  service: 'evaluation',
  resource: 'project-member',
  command: 'list-candidates',
  description: 'List available TE company members for project admission. Administrator only; returns external_id, login_name and display_name, excluding frozen accounts and existing members.',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH),
};
