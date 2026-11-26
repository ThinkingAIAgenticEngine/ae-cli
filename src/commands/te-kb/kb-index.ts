import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/index';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const name = ctx.str('name').trim();
  const scope = ctx.str('scope').trim();
  const sources = ctx.json('sources');
  if (ctx.has?.('name') || ctx.has?.('scope') || name || scope) {
    if (ctx.has?.('sources') || sources !== undefined) {
      throw new CliValidationError('Use either --name with --scope or --sources.');
    }
    if (!name || name.length > 200) {
      throw new CliValidationError('--name must be a knowledge base name of 1 to 200 characters.');
    }
    if (scope !== 'personal' && scope !== 'company' && scope !== 'system') {
      throw new CliValidationError('--name requires --scope personal, company, or system.');
    }
    body.sources = [{ scope, name }];
  } else if (sources) {
    body.sources = sources;
  }
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
    { name: 'read-context', type: 'string', required: false, desc: 'Pin reads to an existing read context' },
    { name: 'name', type: 'string', required: false, desc: 'Exact knowledge base name. Requires --scope and cannot be combined with --sources.' },
    { name: 'scope', type: 'string', required: false, desc: 'Scope of --name: personal | company | system.' },
    {
      name: 'sources',
      type: 'json',
      required: false,
      desc: 'Optional JSON array of knowledge base refs, e.g. [{"scope":"company","name":"engineering-handbook"}]. Omit both filters to list all accessible knowledge bases.',
    },
    { name: 'locale', type: 'string', required: false, desc: 'Optional locale: zh | en | ja | ko' },
  ],
  risk: 'read',
  validate: (ctx) => {
    buildBody(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
