import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/status';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    name: ctx.str('name'),
  };
}

export const status: Command = {
  service: 'kb',
  command: '+status',
  description: 'Query knowledge base status.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
