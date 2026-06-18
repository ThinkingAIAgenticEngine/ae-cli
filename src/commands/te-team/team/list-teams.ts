import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_TEAM_PATH } from '../shared.js';

export const listTeams: Command = {
  service: 'team',
  command: '+list',
  description: 'List all teams visible to the current user.',
  flags: [],
  risk: 'read',
  dryRun: (ctx) => ({ method: 'GET', url: `${ctx.host().replace(/\/$/, '')}${BASE_TEAM_PATH}` }),
  execute: async (ctx) => kbApi(ctx, 'GET', BASE_TEAM_PATH),
};
