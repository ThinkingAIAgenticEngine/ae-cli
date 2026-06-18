import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_RUN_PATH } from '../shared.js';

export const getResult: Command = {
  service: 'team',
  command: '+run-result',
  description: 'Get the full result of a TeamRun (all steps and events).',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'TeamRun ID' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: `${ctx.host().replace(/\/$/, '')}${BASE_RUN_PATH}/${ctx.str('id')}/result`,
  }),
  execute: async (ctx) => kbApi(ctx, 'GET', `${BASE_RUN_PATH}/${ctx.str('id')}/result`),
};
