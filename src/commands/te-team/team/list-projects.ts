import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { API_PREFIX } from '../shared.js';

// F-014: /api/oauth/check is a te-claude route under the /agent base path. Without the prefix the CLI
// hits the bare host → 404 SPA index.html → "Unexpected '<'". Use the shared API_PREFIX like every
// other team path (BASE_TEAM_PATH etc.), so it resolves to /agent/api/oauth/check.
const OAUTH_CHECK_PATH = `${API_PREFIX}/api/oauth/check`;

export const listProjects: Command = {
  service: 'team',
  command: '+list-projects',
  description: 'List all projects available to the current user (from /api/oauth/check).',
  flags: [],
  risk: 'read',
  dryRun: (ctx) => ({ method: 'POST', url: `${ctx.host().replace(/\/$/, '')}${OAUTH_CHECK_PATH}` }),
  execute: async (ctx) => {
    const accessToken = await ctx.token();
    const data = await kbApi(ctx, 'POST', OAUTH_CHECK_PATH, {}, { accessToken });
    return data?.projectInfoList ?? data;
  },
};
