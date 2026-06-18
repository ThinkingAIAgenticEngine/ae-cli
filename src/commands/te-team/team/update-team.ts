import type { Command, RuntimeContext } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_TEAM_PATH } from '../shared.js';

const VALID_SCOPES = new Set(['personal', 'company']);

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const name = ctx.str('name');
  if (name) body.name = name;
  const config = ctx.json('config');
  if (config !== undefined) body.config = config;
  const description = ctx.str('description');
  if (description) body.description = description;
  const scope = ctx.str('scope');
  if (scope) body.scope = scope;
  const enabled = ctx.json('enabled');
  if (enabled !== undefined) body.enabled = enabled;
  return body;
}

export const updateTeam: Command = {
  service: 'team',
  command: '+update',
  description: 'Update an existing team (PATCH — only provided fields are changed).',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Team ID' },
    { name: 'name', type: 'string', required: false, desc: 'New team name' },
    { name: 'config', type: 'json', required: false, desc: 'New TeamConfig JSON' },
    { name: 'description', type: 'string', required: false, desc: 'New description' },
    { name: 'scope', type: 'string', required: false, desc: 'personal | company' },
    { name: 'enabled', type: 'boolean', required: false, desc: 'Whether enabled' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const scope = ctx.str('scope');
    if (scope && !VALID_SCOPES.has(scope)) {
      throw new Error(`Invalid --scope: ${scope}. Must be personal | company`);
    }
  },
  dryRun: (ctx) => ({
    method: 'PATCH',
    url: `${ctx.host().replace(/\/$/, '')}${BASE_TEAM_PATH}/${ctx.str('id')}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'PATCH', `${BASE_TEAM_PATH}/${ctx.str('id')}`, {}, buildBody(ctx)),
};
