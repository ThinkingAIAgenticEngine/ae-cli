import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';
import { CliValidationError } from '../../core/errors.js';

function pathFor(ctx: RuntimeContext): string {
  return `/agents/${evalPathId(ctx, 'id')}/access-scope`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const accessScope = ctx.str('access-scope');
  if (!['PERSONAL', 'COMPANY'].includes(accessScope)) {
    throw new CliValidationError('--access-scope must be PERSONAL or COMPANY');
  }
  return { access_scope: accessScope, lock_version: ctx.num('lock-version') };
}

export const changeAgentAccessScope: Command = {
  service: 'evaluation',
  resource: 'agent',
  command: 'access-scope',
  description: 'Change agent visibility within the current project. Requires an administrator and the current lock_version. COMPANY assets cannot depend on private configurations or credentials.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Agent UUID', 'agent'),
    { name: 'access-scope', type: 'string', required: true, pattern: '^(PERSONAL|COMPANY)$', desc: 'Target visibility: PERSONAL | COMPANY; SYSTEM is read-only' },
  ],
  risk: 'high-risk-write',
  preflight: (ctx) => { buildBody(ctx); },
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
