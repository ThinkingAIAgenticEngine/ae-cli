import type { Command, RuntimeContext } from '../../framework/types.js';

const API_PATH = '/agent/api/external/knowledge-bases/query';

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    query: ctx.str('query'),
    sources: ctx.json('sources') as KnowledgeBaseRef[],
  };
}

export const query: Command = {
  service: 'kb',
  command: '+query',
  description: 'Query knowledge.',
  flags: [
    { name: 'query', type: 'string', required: true, alias: 'q', desc: 'Natural language question to query against the knowledge bases' },
    { name: 'sources', type: 'json', required: true, desc: 'JSON array of knowledge base refs, e.g. [{"scope":"company","name":"engineering-handbook"}]' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => ctx.api('POST', API_PATH, {}, buildBody(ctx)),
};
