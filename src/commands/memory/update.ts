import type { Command } from '../../framework/types.js';
import { memoryMutationBody, MEMORY_SERVICE, targetDryRun, targetFlags, targetPatch, version } from './shared.js';

export const updateMemory: Command = {
  service: MEMORY_SERVICE,
  command: '+update',
  description: 'Update an AgentSpace memory using optimistic concurrency',
  flags: [...targetFlags, { name: 'id', type: 'string', required: true, desc: 'Memory ID' }, { name: 'version', type: 'number', required: true, desc: 'Current memory version' }, { name: 'title', type: 'string', required: false, desc: 'Replacement title' }, { name: 'content', type: 'string', required: true, maxLength: 4000, desc: 'Replacement content' }],
  risk: 'write',
  validate: version,
  dryRun: (ctx) => targetDryRun(ctx, 'PATCH', `memories/${encodeURIComponent(ctx.str('id'))}`, memoryMutationBody(ctx)),
  execute: (ctx) => targetPatch(ctx, `memories/${encodeURIComponent(ctx.str('id'))}`, memoryMutationBody(ctx)),
};
