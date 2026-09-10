import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { CliValidationError } from '../../core/errors.js';

const API_PATH = '/agent/api/external/knowledge-bases/read';
const VALID_EXPAND_MODES = new Set(['block', 'none']);
const MAX_READ_LIMIT = 2000;

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function readExpand(ctx: RuntimeContext): string | undefined {
  const expand = ctx.str('expand').trim();
  if (!expand) return undefined;
  if (!VALID_EXPAND_MODES.has(expand)) {
    throw new CliValidationError(
      `Invalid --expand: ${expand}. Must be one of: block | none`,
    );
  }
  return expand;
}

function readLimit(ctx: RuntimeContext): number | undefined {
  const limit = ctx.optionalNum('limit');
  if (limit === undefined) return undefined;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_READ_LIMIT) {
    throw new CliValidationError(
      `Invalid --limit: ${limit}. Must be an integer from 1 to ${MAX_READ_LIMIT}`,
    );
  }
  return limit;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    source: ctx.json('source') as KnowledgeBaseRef,
    path: ctx.str('path'),
  };
  const offset = ctx.optionalNum('offset');
  if (offset !== undefined) body.offset = offset;
  const limit = ctx.optionalNum('limit');
  if (limit !== undefined) body.limit = limit;
  const expand = readExpand(ctx);
  if (expand) body.expand = expand;
  if (ctx.bool('outline')) body.outline = true;
  const locale = ctx.str('locale');
  if (locale) body.locale = locale;
  return body;
}

export const kbRead: Command = {
  service: 'kb',
  command: '+read',
  description:
    'Read a full knowledge base page (or a line window) via POST /agent/api/external/knowledge-bases/read. Use after +index / +grep locate a candidate page. Pass --outline to get only the page heading tree (no content) and pick a section to read.',
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
    { name: 'offset', type: 'number', required: false, min: 1, desc: 'Start line (1-based integer). Omit to read from the beginning.' },
    { name: 'limit', type: 'number', required: false, min: 1, max: MAX_READ_LIMIT, desc: 'Max number of lines to return (1-2000).' },
    { name: 'expand', type: 'string', required: false, desc: 'Read-window expansion mode: block | none (omit for the server default: block)' },
    {
      name: 'outline',
      type: 'boolean',
      required: false,
      desc: 'Return only the page outline (headings with line numbers), no content. Use it to decide which section to read on long pages.',
    },
    { name: 'locale', type: 'string', required: false, desc: 'Optional locale: zh | en | ja | ko' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const offset = ctx.optionalNum('offset');
    if (offset !== undefined && !Number.isInteger(offset)) {
      throw new CliValidationError('--offset must be an integer.');
    }
    readLimit(ctx);
    readExpand(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
