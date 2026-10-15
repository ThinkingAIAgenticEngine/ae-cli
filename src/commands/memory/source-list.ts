import type { Command } from '../../framework/types.js';
import { MEMORY_SERVICE, optional, query, targetDryRun, targetFlags, targetGet } from './shared.js';

export const listMemorySources: Command = {
  service: MEMORY_SERVICE,
  command: '+source-list',
  description: 'List conversations eligible as AgentSpace memory extraction sources',
  flags: [...targetFlags, { name: 'cursor', type: 'string', required: false, desc: 'Pagination cursor' }, { name: 'limit', type: 'number', required: false, default: 20, min: 1, max: 50, desc: 'Page size, 1-50; default 20' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `sources${query({ cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
  execute: (ctx) => targetGet(ctx, `sources${query({ cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
};
