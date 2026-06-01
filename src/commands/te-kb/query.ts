import type { Command, RuntimeContext } from '../../framework/types.js';

const API_PATH = '/agent/api/external/knowledge-bases/query';

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    query: ctx.str('query'),
    sources: ctx.json('sources') as KnowledgeBaseRef[],
  };

  const modelId = ctx.str('model-id');
  if (modelId) body.modelId = modelId;

  const maxTurnsRaw = ctx.str('max-turns');
  if (maxTurnsRaw !== '') body.maxTurns = ctx.num('max-turns');

  return body;
}

export const query: Command = {
  service: 'kb',
  command: '+query',
  description: 'Query knowledge.',
  flags: [
    { name: 'query', type: 'string', required: true, alias: 'q', desc: 'Natural language question to query against the knowledge bases' },
    { name: 'sources', type: 'json', required: true, desc: 'JSON array of knowledge base refs, e.g. [{"scope":"company","name":"engineering-handbook"}]' },
    { name: 'model-id', type: 'string', required: false, default: 'AE-Auto', desc: 'Model identifier (default: AE-Auto)' },
    { name: 'max-turns', type: 'number', required: false, default: 6, desc: 'Maximum reasoning turns (default: 6)' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => ctx.api('POST', API_PATH, {}, buildBody(ctx)),
};
