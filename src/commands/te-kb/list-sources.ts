import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/sources';
const MAX_KNOWLEDGE_BASE_NAME_LENGTH = 200;

function knowledgeBaseName(ctx: RuntimeContext): string {
  return ctx.str('name').trim();
}

function buildUrl(ctx: RuntimeContext): string {
  const url = new URL(`${ctx.host().replace(/\/$/, '')}${API_PATH}`);
  url.searchParams.set('name', knowledgeBaseName(ctx));
  return url.toString();
}

export const listSources: Command = {
  service: 'kb',
  command: '+list-sources',
  description:
    'List source metadata for a knowledge base via GET /agent/api/external/knowledge-bases/sources?name=<name>. Copy the stable source ID from this output before using +rm-source.',
  flags: [
    {
      name: 'name',
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: MAX_KNOWLEDGE_BASE_NAME_LENGTH,
      desc: 'Knowledge base name',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    const name = knowledgeBaseName(ctx);
    if (!name) {
      throw new CliValidationError('Invalid --name: must be non-empty.');
    }
    if (name.length > MAX_KNOWLEDGE_BASE_NAME_LENGTH) {
      throw new CliValidationError(
        `Invalid --name length: ${name.length}. Must be at most ${MAX_KNOWLEDGE_BASE_NAME_LENGTH} characters.`,
      );
    }
  },
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildUrl(ctx),
  }),
  execute: async (ctx) =>
    kbApi(
      ctx,
      'GET',
      API_PATH,
      { name: knowledgeBaseName(ctx) },
      undefined,
      { preserveErrorMetadata: true, retryUnauthorized: true },
    ),
};
