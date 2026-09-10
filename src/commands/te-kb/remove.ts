import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { name: ctx.str('name') };
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  if (scope) body.scope = scope;
  return body;
}

export const remove: Command = {
  service: 'kb',
  command: '+remove',
  description: 'Delete an entire knowledge.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name to delete' },
    { name: 'scope', type: 'string', required: false, desc: 'Exact knowledge base scope: personal | company (omit for personal → company fallback)' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => {
    getExternalKnowledgeBaseTargetScope(ctx);
  },
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'DELETE', API_PATH, {}, buildBody(ctx)),
};
