import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/sources/url';

function validateUrl(url: string): void {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Invalid --url: ${url}. Must be an http(s) URL`);
  }
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    url: ctx.str('url'),
  };

  const displayName = ctx.str('display-name');
  if (displayName) body.displayName = displayName;

  const parseInstruction = ctx.str('parse-instruction');
  if (parseInstruction) body.parseInstruction = parseInstruction;

  return body;
}

export const url: Command = {
  service: 'kb',
  command: '+url',
  description: 'Upload a URL source to a knowledge base.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name' },
    { name: 'url', type: 'string', required: true, desc: 'Source URL to upload' },
    { name: 'display-name', type: 'string', required: false, desc: 'Optional display name for the URL source' },
    { name: 'parse-instruction', type: 'string', required: false, desc: 'Optional parsing instruction for the URL source' },
  ],
  risk: 'write',
  validate: (ctx) => {
    validateUrl(ctx.str('url'));
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
