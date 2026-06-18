import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_RUN_PATH } from '../shared.js';

export const cancelRun: Command = {
  service: 'team',
  command: '+run-cancel',
  description: 'Cancel a TeamRun.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'TeamRun ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${BASE_RUN_PATH}/${ctx.str('id')}/cancel`,
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', `${BASE_RUN_PATH}/${ctx.str('id')}/cancel`, {}, {}),
};
