import type { Command } from '../../framework/types.js';
import { conversationId, MEMORY_SERVICE, optional, query, targetDryRun, targetFlags, targetGet } from './shared.js';

export const listMemoryJobs: Command = {
  service: MEMORY_SERVICE,
  command: '+job-list',
  description: 'List AgentSpace memory extraction jobs',
  flags: [...targetFlags, { name: 'cursor', type: 'string', required: false, desc: 'Pagination cursor' }, { name: 'limit', type: 'number', required: false, default: 20, min: 1, max: 50, desc: 'Page size, 1-50; default 20' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `jobs${query({ conversationId: conversationId(ctx), cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
  execute: (ctx) => targetGet(ctx, `jobs${query({ conversationId: conversationId(ctx), cursor: optional(ctx, 'cursor'), limit: ctx.num('limit') || 20 })}`),
};
