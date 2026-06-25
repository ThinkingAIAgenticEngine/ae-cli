import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/read';

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    source: ctx.json('source') as KnowledgeBaseRef,
    path: ctx.str('path'),
  };
  const offset = ctx.num('offset');
  if (offset) body.offset = offset;
  const limit = ctx.num('limit');
  if (limit) body.limit = limit;
  const locale = ctx.str('locale');
  if (locale) body.locale = locale;
  return body;
}

export const kbRead: Command = {
  service: 'kb',
  command: '+read',
  description:
    'Read a full knowledge base page (or a line window) via POST /agent/api/external/knowledge-bases/read. Use after +index / +grep locate a candidate page.',
  flags: [
    {
      name: 'source',
      type: 'json',
      required: true,
      desc: 'Knowledge base ref pointing to exactly one base, e.g. {"scope":"company","name":"engineering-handbook"}',
    },
    {
      name: 'path',
      type: 'string',
      required: true,
      desc: 'Page path relative to the knowledge base root, e.g. wiki/concepts/data-model.md or index.md',
    },
    { name: 'offset', type: 'number', required: false, desc: 'Start line (1-based). Omit to read from the beginning.' },
    { name: 'limit', type: 'number', required: false, desc: 'Max number of lines to return (1-10000).' },
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
