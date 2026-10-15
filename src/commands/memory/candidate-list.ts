import type { Command } from '../../framework/types.js';
import { assertOneOf, CANDIDATE_STATUSES, CANDIDATE_VIEWS, MEMORY_SERVICE, optional, query, targetDryRun, targetFlags, targetGet } from './shared.js';

export const listMemoryCandidates: Command = {
  service: MEMORY_SERVICE,
  command: '+candidate-list',
  description: 'List shared AgentSpace memory candidates',
  flags: [...targetFlags, { name: 'view', type: 'string', required: false, default: 'mine', desc: 'mine | pending' }, { name: 'status', type: 'string', required: false, desc: 'Filter the mine view by candidate status' }, { name: 'cursor', type: 'string', required: false, desc: 'Pagination cursor' }, { name: 'limit', type: 'number', required: false, default: 20, min: 1, max: 50, desc: 'Page size, 1-50; default 20' }],
  risk: 'read',
  validate: (ctx) => {
    assertOneOf('view', ctx.str('view'), CANDIDATE_VIEWS);
    assertOneOf('status', optional(ctx, 'status'), CANDIDATE_STATUSES);
    if (ctx.str('view') === 'pending' && optional(ctx, 'status')) throw new Error('--status is only valid with --view mine');
  },
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `candidates${query({ view: ctx.str('view') || 'mine', status: optional(ctx, 'status'), cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
  execute: (ctx) => targetGet(ctx, `candidates${query({ view: ctx.str('view') || 'mine', status: optional(ctx, 'status'), cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
};
