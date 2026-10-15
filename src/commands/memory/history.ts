import type { Command } from '../../framework/types.js';
import { MEMORY_SERVICE, query, targetDryRun, targetFlags, targetGet } from './shared.js';

export const historyMemory: Command = {
  service: MEMORY_SERVICE,
  command: '+history',
  description: 'List revision history for one AgentSpace memory',
  flags: [...targetFlags, { name: 'id', type: 'string', required: true, desc: 'Memory ID' }, { name: 'cursor', type: 'number', required: false, min: 1, desc: 'Revision cursor' }, { name: 'limit', type: 'number', required: false, default: 20, min: 1, max: 50, desc: 'Page size, 1-50; default 20' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `memories/${encodeURIComponent(ctx.str('id'))}/history${query({ cursor: ctx.optionalNum('cursor'), limit: ctx.num('limit') || 20 })}`),
  execute: (ctx) => targetGet(ctx, `memories/${encodeURIComponent(ctx.str('id'))}/history${query({ cursor: ctx.optionalNum('cursor'), limit: ctx.num('limit') || 20 })}`),
};
