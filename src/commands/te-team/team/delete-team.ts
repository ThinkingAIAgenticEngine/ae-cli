import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_TEAM_PATH } from '../shared.js';

export const deleteTeam: Command = {
  service: 'team',
  command: '+delete',
  description: 'Delete a team by ID. Returns 409 if there are running tasks.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Team ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${ctx.host().replace(/\/$/, '')}${BASE_TEAM_PATH}/${ctx.str('id')}`,
  }),
  execute: async (ctx) => kbApi(ctx, 'DELETE', `${BASE_TEAM_PATH}/${ctx.str('id')}`),
};
