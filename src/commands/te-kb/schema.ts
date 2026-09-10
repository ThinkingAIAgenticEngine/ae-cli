import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases/schema';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
  };

  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  if (scope) body.scope = scope;

  if (ctx.bool('force')) body.force = true;

  const model = ctx.str('model');
  if (model) body.model = model;

  const customInstructions = ctx.str('custom-instructions');
  if (customInstructions) body.customInstructions = customInstructions;

  return body;
}

export async function executeSchema(
  ctx: RuntimeContext,
  api: typeof kbApi = kbApi,
): Promise<unknown> {
  return api(ctx, 'POST', API_PATH, {}, buildBody(ctx), {
    preserveBusinessErrorCode: true,
  });
}

export const schema: Command = {
  service: 'kb',
  command: '+schema',
  description: 'Generate the compile schema for a knowledge base via POST /agent/api/external/knowledge-bases/schema.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name (looked up personal → company)' },
    { name: 'scope', type: 'string', required: false, desc: 'Exact knowledge base scope: personal | company (omit for personal → company fallback)' },
    { name: 'force', type: 'boolean', required: false, desc: 'Preempt generation even when status is `generating` (use only for stuck recovery)' },
    { name: 'model', type: 'string', required: false, desc: 'Optional model reference: Model.id, legacy modelId, or modelId::scope' },
    {
      name: 'custom-instructions',
      type: 'string',
      required: false,
      sensitive: true,
      desc: 'Optional per-run instructions for generating this knowledge base schema',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    getExternalKnowledgeBaseTargetScope(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: executeSchema,
};
