import type { Command, RuntimeContext } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_TEAM_PATH } from '../shared.js';

const VALID_SCOPES = new Set(['personal', 'company']);

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    config: ctx.json('config'),
  };
  const description = ctx.str('description');
  if (description) body.description = description;
  const scope = ctx.str('scope');
  if (scope) body.scope = scope;
  const enabled = ctx.json('enabled');
  if (enabled !== undefined) body.enabled = enabled;
  return body;
}

export const createTeam: Command = {
  service: 'team',
  command: '+create',
  description: 'Create a new AI agent team.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Team name (1–100 chars)' },
    { name: 'config', type: 'json', required: true, desc: 'TeamConfig JSON object' },
    { name: 'description', type: 'string', required: false, desc: 'Team description (≤2000 chars)' },
    { name: 'scope', type: 'string', required: false, desc: 'personal (default) | company' },
    { name: 'enabled', type: 'boolean', required: false, desc: 'Whether enabled, default true' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const scope = ctx.str('scope');
    if (scope && !VALID_SCOPES.has(scope)) {
      throw new Error(`Invalid --scope: ${scope}. Must be personal | company`);
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${BASE_TEAM_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', BASE_TEAM_PATH, {}, buildBody(ctx)),
};
