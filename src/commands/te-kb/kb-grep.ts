import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/grep';

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    query: ctx.str('query'),
    sources: ctx.json('sources') as KnowledgeBaseRef[],
    paths: ctx.json('paths') as string[],
  };
  const topK = ctx.optionalNum('top-k');
  if (topK !== undefined) body.topK = topK;
  const locale = ctx.str('locale');
  if (locale) body.locale = locale;
  return body;
}

export const kbGrep: Command = {
  service: 'kb',
  command: '+grep',
  description:
    'Keyword-search knowledge base pages via POST /agent/api/external/knowledge-bases/grep. Returns a page-level results array: one entry per page with hitCount (full match count), pageKind (content/catalog), up to 4 sections previews (breadcrumb, sectionStartLine/sectionEndLine, text excerpt) and moreSections. Copy --paths from +index (wiki pages, module catalog pages, or subdirectories); read the matched section range with +read.',
  flags: [
    {
      name: 'query',
      type: 'string',
      required: true,
      alias: 'q',
      desc: 'Keywords to search across the knowledge bases',
    },
    {
      name: 'sources',
      type: 'json',
      required: true,
      desc: 'JSON array of knowledge base refs, e.g. [{"scope":"company","name":"engineering-handbook"}]',
    },
    {
      name: 'paths',
      type: 'json',
      required: true,
      desc: 'JSON array of wiki pages or subdirectories copied from +index, e.g. ["wiki/sandbox.md"] or ["wiki/guides"]',
    },
    { name: 'top-k', type: 'number', required: false, min: 1, max: 50, desc: 'Max number of pages to return (1-50, default 10)' },
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
