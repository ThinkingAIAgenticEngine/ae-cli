import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';

const OAUTH_CHECK_PATH = '/api/oauth/check';

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
