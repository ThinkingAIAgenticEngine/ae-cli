import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluation-run-schedules';

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const status = ctx.str('status');
  if (status) params.status = status;
  const cursor = ctx.str('cursor');
  if (cursor) params.cursor = cursor;
  const limit = ctx.optionalNum('limit');
  if (limit !== undefined) params.limit = limit;
  return params;
}

export const listSchedules: Command = {
  service: 'evaluation',
  command: '+list_schedules',
  description:
    'List evaluation run schedules via GET /agenteval/api/v1/evaluation-run-schedules. Returns a cursor-paginated page with next occurrence and status.',
  flags: [
    ...evalFlags(),
    {
      name: 'status',
      type: 'string',
      desc: 'Filter by schedule status: PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED',
    },
    { name: 'cursor', type: 'string', desc: 'Opaque pagination cursor from the previous page' },
    { name: 'limit', type: 'number', min: 1, max: 200, desc: 'Page size (1-200, default 50)' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH, buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH, buildParams(ctx)),
};
