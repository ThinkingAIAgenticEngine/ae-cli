import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/schema';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
  };

  if (ctx.bool('force')) body.force = true;

  const model = ctx.str('model');
  if (model) body.model = model;

  return body;
}

export const schema: Command = {
  service: 'kb',
  command: '+schema',
  description: 'Generate the compile schema for a knowledge base via POST /agent/api/external/knowledge-bases/schema.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name (looked up personal → company)' },
    { name: 'force', type: 'boolean', required: false, desc: 'Preempt generation even when status is `generating` (use only for stuck recovery)' },
    { name: 'model', type: 'string', required: false, desc: 'Optional model displayName to use for schema generation' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
