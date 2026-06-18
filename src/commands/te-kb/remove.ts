import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { name: ctx.str('name') };
}

export const remove: Command = {
  service: 'kb',
  command: '+remove',
  description: 'Delete an entire knowledge.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name to delete' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'DELETE', API_PATH, {}, buildBody(ctx)),
};
