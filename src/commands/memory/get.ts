import type { Command } from '../../framework/types.js';
import { MEMORY_SERVICE, targetDryRun, targetFlags, targetGet } from './shared.js';

export const getMemory: Command = {
  service: MEMORY_SERVICE,
  command: '+get',
  description: 'Get one AgentSpace memory and recent revisions',
  flags: [...targetFlags, { name: 'id', type: 'string', required: true, desc: 'Memory ID' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `memories/${encodeURIComponent(ctx.str('id'))}`),
  execute: (ctx) => targetGet(ctx, `memories/${encodeURIComponent(ctx.str('id'))}`),
};
