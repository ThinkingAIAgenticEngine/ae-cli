import type { Command } from '../../framework/types.js';
import { assertOneOf, MEMORY_SERVICE, MEMORY_STATUSES, optional, query, targetDryRun, targetFlags, targetGet } from './shared.js';

export const listMemories: Command = {
  service: MEMORY_SERVICE,
  command: '+list',
  description: 'List memories in the resolved AgentSpace',
  flags: [...targetFlags, { name: 'status', type: 'string', required: false, default: 'active', desc: 'active | deleted' }, { name: 'query', type: 'string', required: false, desc: 'Search text in memory title or content' }, { name: 'cursor', type: 'string', required: false, desc: 'Pagination cursor' }, { name: 'limit', type: 'number', required: false, default: 20, min: 1, max: 50, desc: 'Page size, 1-50; default 20' }],
  risk: 'read',
  validate: (ctx) => assertOneOf('status', ctx.str('status'), MEMORY_STATUSES),
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `memories${query({ status: ctx.str('status') || 'active', query: optional(ctx, 'query'), cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
  execute: (ctx) => targetGet(ctx, `memories${query({ status: ctx.str('status') || 'active', query: optional(ctx, 'query'), cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
};
