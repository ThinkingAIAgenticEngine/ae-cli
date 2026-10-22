import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluation-runs';

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const search = ctx.str('search');
  if (search) params.search = search;
  const status = ctx.str('status');
  if (status) params.status = status;
  const cursor = ctx.str('cursor');
  if (cursor) params.cursor = cursor;
  const limit = ctx.optionalNum('limit');
  if (limit !== undefined) params.limit = limit;
  return params;
}

export const listRuns: Command = {
  service: 'evaluation',
  command: '+list_runs',
  description:
    'List evaluation runs via GET /agenteval/api/v1/evaluation-runs. Returns a cursor-paginated page with snapshot names, counts, and average score.',
  flags: [
    ...evalFlags(),
    { name: 'search', type: 'string', desc: 'Search text matching run name/description' },
    {
      name: 'status',
      type: 'string',
      desc: 'Filter by run status: DRAFT | QUEUED | RUNNING | CANCELLING | COMPLETED | PARTIALLY_FAILED | FAILED | CANCELLED',
    },
    { name: 'cursor', type: 'string', desc: 'Opaque pagination cursor from the previous page' },
    { name: 'limit', type: 'number', min: 1, max: 200, desc: 'Page size (1-200, default 50)' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH, buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH, buildParams(ctx)),
};
