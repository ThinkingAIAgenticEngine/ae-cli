import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases/status';

function getRunId(ctx: RuntimeContext): string {
  const value = ctx.str('run-id');
  if (value && !value.trim()) throw new Error('--run-id must not be blank.');
  return value.trim();
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
  };
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  if (scope) body.scope = scope;
  const runId = getRunId(ctx);
  if (runId) body.runId = runId;
  return body;
}

export const status: Command = {
  service: 'kb',
  command: '+status',
  description: 'Query knowledge base status.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name' },
    { name: 'scope', type: 'string', required: false, desc: 'Exact knowledge base scope: personal | company (omit for personal → company fallback)' },
    { name: 'run-id', type: 'string', required: false, desc: 'Exact compile run ID returned by +compile; returns compileRun instead of aggregate KB status' },
  ],
  risk: 'read',
  validate: (ctx) => {
    getExternalKnowledgeBaseTargetScope(ctx);
    getRunId(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
