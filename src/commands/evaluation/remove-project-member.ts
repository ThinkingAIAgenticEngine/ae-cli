import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

function pathFor(ctx: RuntimeContext): string {
  return `/projects/members/${evalPathId(ctx, 'id')}`;
}

export const removeProjectMember: Command = {
  service: 'evaluation',
  resource: 'project-member',
  command: 'remove',
  description: 'Revoke membership and future login access to the current project until explicitly re-added. Administrator only; root members are protected. Other projects are unaffected.',
  flags: [
    ...evalFlags(),
    idFlag('Project member user UUID from +list_project_members'),
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx)),
};
