import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';
import { CliValidationError } from '../../core/errors.js';

function pathFor(ctx: RuntimeContext): string {
  return `/projects/members/${evalPathId(ctx, 'id')}/role`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const value = ctx.str('role');
  if (!['agent_admin', 'member'].includes(value)) {
    throw new CliValidationError('--role must be agent_admin or member');
  }
  return { role: value };
}

export const changeProjectMemberRole: Command = {
  service: 'evaluation',
  resource: 'project-member',
  command: 'change-role',
  description: 'Change a project role. Administrator only; root members are protected.',
  flags: [
    ...evalFlags(),
    idFlag('Project member user UUID from +list_project_members'),
    { name: 'role', type: 'string', required: true, pattern: '^(agent_admin|member)$', desc: 'Target role: agent_admin | member' },
  ],
  risk: 'high-risk-write',
  preflight: (ctx) => { buildBody(ctx); },
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
