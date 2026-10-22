import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases`;
}

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const pageSize = ctx.optionalNum('page-size');
  if (pageSize !== undefined) params.page_size = pageSize;
  const cursor = ctx.str('cursor');
  if (cursor) params.cursor = cursor;
  return params;
}

export const listDatasetCases: Command = {
  service: 'evaluation',
  command: '+list_dataset_cases',
  description:
    'List the cases of a dataset with their field data via GET /agenteval/api/v1/datasets/{id}/cases (cursor-paginated). Use +get_dataset_case for one case in full.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'cursor', type: 'string', desc: 'Pagination cursor from the previous response next_cursor' },
    { name: 'page-size', type: 'number', min: 1, max: 200, desc: 'Page size (default 50)' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx), buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx), buildParams(ctx)),
};
