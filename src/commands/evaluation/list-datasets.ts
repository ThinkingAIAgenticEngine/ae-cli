import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/datasets';

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const search = ctx.str('search');
  if (search) params.search = search;
  const status = ctx.str('status');
  if (status) params.status = status;
  const cursor = ctx.str('cursor');
  if (cursor) params.cursor = cursor;
  const pageSize = ctx.optionalNum('page-size');
  if (pageSize !== undefined) params.page_size = pageSize;
  return params;
}

export const listDatasets: Command = {
  service: 'evaluation',
  command: '+list_datasets',
  description:
    'List evaluation datasets via GET /agenteval/api/v1/datasets. Returns a cursor-paginated page of datasets.',
  flags: [
    ...evalFlags(),
    { name: 'search', type: 'string', desc: 'Search text matching dataset name/description' },
    {
      name: 'status',
      type: 'string',
      desc: 'Filter by dataset status: CREATING | READY | IMPORT_FAILED',
    },
    { name: 'cursor', type: 'string', desc: 'Opaque pagination cursor from the previous page' },
    {
      name: 'page-size',
      type: 'number',
      min: 1,
      max: 200,
      desc: 'Page size (1-200, default 50)',
    },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH, buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH, buildParams(ctx)),
};
