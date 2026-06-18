import type { Command, RuntimeContext } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_RUN_PATH } from '../shared.js';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { input: ctx.str('input') };
}

export const replyRun: Command = {
  service: 'team',
  command: '+run-reply',
  description: 'Reply to a TeamRun that is in waiting_user state.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'TeamRun ID (must be in waiting_user state)' },
    { name: 'input', type: 'string', required: true, desc: 'User reply content (1–50000 chars)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${BASE_RUN_PATH}/${ctx.str('id')}/reply`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', `${BASE_RUN_PATH}/${ctx.str('id')}/reply`, {}, buildBody(ctx)),
};
