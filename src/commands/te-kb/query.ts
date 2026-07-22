import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/query';

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    query: ctx.str('query'),
  };
  const sources = ctx.json('sources') as KnowledgeBaseRef[] | undefined;
  if (sources) body.sources = sources;
  const topK = ctx.num('top-k');
  if (topK) body.topK = topK;
  const locale = ctx.str('locale');
  if (locale) body.locale = locale;
  return body;
}

export const query: Command = {
  service: 'kb',
  command: '+query',
  description:
    'Query knowledge bases via POST /agent/api/external/knowledge-bases/query. Returns ranked passages for a natural-language question.',
  flags: [
    {
      name: 'query',
      type: 'string',
      required: true,
      alias: 'q',
      desc: 'Natural language question to query against the knowledge bases',
    },
    {
      name: 'sources',
      type: 'json',
      required: false,
      desc: 'Optional JSON array of knowledge base refs to scope the query, e.g. [{"scope":"company","name":"engineering-handbook"}]. Omit to search all accessible knowledge bases.',
    },
    { name: 'top-k', type: 'number', required: false, desc: 'Max number of hits to return (1-10000, default 10)' },
    { name: 'locale', type: 'string', required: false, desc: 'Optional locale: zh | en | ja | ko' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
