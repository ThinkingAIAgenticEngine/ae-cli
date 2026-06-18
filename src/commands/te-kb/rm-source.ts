import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/sources';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    name: ctx.str('name'),
    displayName: ctx.str('display-name'),
  };
}

export const rmSource: Command = {
  service: 'kb',
  command: '+rm-source',
  description: 'Delete a single source file inside a knowledge.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name (looked up personal → company)' },
    { name: 'display-name', type: 'string', required: true, desc: 'Source file display name as uploaded (e.g. kb-1780046712-foo.md)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'DELETE', API_PATH, {}, buildBody(ctx)),
};
