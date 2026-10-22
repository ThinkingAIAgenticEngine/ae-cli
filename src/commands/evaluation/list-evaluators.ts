import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluators';

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const search = ctx.str('search');
  if (search) params.search = search;
  const cursor = ctx.str('cursor');
  if (cursor) params.cursor = cursor;
  const pageSize = ctx.optionalNum('page-size');
  if (pageSize !== undefined) params.page_size = pageSize;
  return params;
}

export const listEvaluators: Command = {
  service: 'evaluation',
  command: '+list_evaluators',
  description:
    'List LLM judge evaluators via GET /agenteval/api/v1/evaluators. Returns a cursor-paginated page.',
  flags: [
    ...evalFlags(),
    { name: 'search', type: 'string', desc: 'Search text matching evaluator name/description' },
    { name: 'cursor', type: 'string', desc: 'Opaque pagination cursor from the previous page' },
    { name: 'page-size', type: 'number', min: 1, max: 200, desc: 'Page size (1-200, default 50)' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH, buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH, buildParams(ctx)),
};
