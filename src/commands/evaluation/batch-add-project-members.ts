import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';
import { CliValidationError } from '../../core/errors.js';

const PATH = '/projects/members/batch-add';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const members = ctx.json('members-json');
  if (!Array.isArray(members) || members.length === 0 || members.some((m) =>
    !m || typeof m !== 'object' || Array.isArray(m) ||
    typeof m.external_id !== 'string' || !m.external_id.trim() || m.external_id.length > 191 ||
    (m.display_name !== undefined && (typeof m.display_name !== 'string' || m.display_name.length > 128)) ||
    Object.keys(m).some((key) => !['external_id', 'display_name'].includes(key)))) {
    throw new CliValidationError('--members-json must be a nonempty array of {external_id, display_name?}');
  }
  return { members };
}

export const batchAddProjectMembers: Command = {
  service: 'evaluation',
  resource: 'project-member',
  command: 'batch-add',
  description: 'Admit TE identities to the current project whitelist. Administrator only; existing members are skipped. Use external IDs from project-member list-candidates.',
  flags: [
    ...evalFlags(),
    { name: 'members-json', type: 'json', required: true, sensitive: true, desc: 'Nonempty array of {external_id, display_name?}; external_id is a TE identity, not a member UUID' },
  ],
  risk: 'high-risk-write',
  preflight: (ctx) => { buildBody(ctx); },
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
