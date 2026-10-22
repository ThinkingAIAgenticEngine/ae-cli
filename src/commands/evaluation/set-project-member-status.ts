import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';
import { CliValidationError } from '../../core/errors.js';

function pathFor(ctx: RuntimeContext): string {
  return `/projects/members/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const value = ctx.str('status');
  if (!['ACTIVE', 'DISABLED'].includes(value)) {
    throw new CliValidationError('--status must be ACTIVE or DISABLED');
  }
  return { status: value };
}

export const setProjectMemberStatus: Command = {
  service: 'evaluation',
  resource: 'project-member',
  command: 'set-status',
  description: 'Enable or disable a login across every project in the tenant. Administrator only; identities with a root role are protected.',
  flags: [
    ...evalFlags(),
    idFlag('Project member user UUID from +list_project_members'),
    { name: 'status', type: 'string', required: true, pattern: '^(ACTIVE|DISABLED)$', desc: 'Target status: ACTIVE | DISABLED' },
  ],
  risk: 'high-risk-write',
  preflight: (ctx) => { buildBody(ctx); },
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
