import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { CliValidationError } from '../../core/errors.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases/sources';

function sourceSelector(ctx: RuntimeContext): { id: string } | { displayName: string } {
  const id = ctx.str('id').trim();
  if (id) return { id };

  const displayName = ctx.str('display-name').trim();
  if (displayName) return { displayName };

  throw new CliValidationError('One of --id or --display-name is required.');
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
  };
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  if (scope) body.scope = scope;
  return { ...body, ...sourceSelector(ctx) };
}

export const rmSource: Command = {
  service: 'kb',
  command: '+rm-source',
  description: 'Delete one source from a knowledge base by ID or exact display name.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name (looked up personal → company)' },
    { name: 'scope', type: 'string', required: false, desc: 'Exact knowledge base scope: personal | company (omit for personal → company fallback)' },
    { name: 'id', type: 'string', required: false, desc: 'Source ID copied from +list-sources (preferred)' },
    { name: 'display-name', type: 'string', required: false, desc: 'Exact source display name for legacy compatibility' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => {
    getExternalKnowledgeBaseTargetScope(ctx);
    sourceSelector(ctx);
  },
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) =>
    kbApi(ctx, 'DELETE', API_PATH, {}, buildBody(ctx), {
      preserveErrorMetadata: true,
    }),
};
