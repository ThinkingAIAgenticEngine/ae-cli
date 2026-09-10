import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases/compile';
const VALID_MODES = new Set(['incremental', 'full']);

function getMode(ctx: RuntimeContext): string {
  const mode = ctx.str('mode') || 'incremental';
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid --mode: ${mode}. Must be one of: incremental | full`);
  }
  return mode;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    mode: getMode(ctx),
  };
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  if (scope) body.scope = scope;
  const model = ctx.str('model');
  if (model) body.model = model;
  return body;
}

export const compile: Command = {
  service: 'kb',
  command: '+compile',
  description: 'Compile a knowledge.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name' },
    { name: 'mode', type: 'string', required: false, default: 'incremental', desc: 'Compile mode: incremental | full (default: incremental)' },
    { name: 'scope', type: 'string', required: false, desc: 'Exact knowledge base scope: personal | company (omit for personal → company fallback)' },
    { name: 'model', type: 'string', required: false, desc: 'Optional model reference: Model.id, legacy modelId, or modelId::scope' },
  ],
  risk: 'write',
  validate: (ctx) => {
    getMode(ctx);
    getExternalKnowledgeBaseTargetScope(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
