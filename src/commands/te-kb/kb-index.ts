import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/index';

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const sources = ctx.json('sources') as KnowledgeBaseRef[] | undefined;
  if (sources) body.sources = sources;
  const locale = ctx.str('locale');
  if (locale) body.locale = locale;
  return body;
}

export const kbIndex: Command = {
  service: 'kb',
  command: '+index',
  description:
    'List accessible knowledge bases and their index.md navigation maps via POST /agent/api/external/knowledge-bases/index. Call this first to see the layout, then use +grep to locate and +read to open pages.',
  flags: [
    {
      name: 'sources',
      type: 'json',
      required: false,
      desc: 'Optional JSON array of knowledge base refs to scope the index, e.g. [{"scope":"company","name":"engineering-handbook"}]. Omit to list all accessible knowledge bases.',
    },
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
