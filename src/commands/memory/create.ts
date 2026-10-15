import type { Command } from '../../framework/types.js';
import { memoryBody, MEMORY_SERVICE, targetDryRun, targetFlags, targetPost } from './shared.js';

export const createMemory: Command = {
  service: MEMORY_SERVICE,
  command: '+create',
  description: 'Create an AgentSpace memory or submit it for shared-space review',
  flags: [...targetFlags, { name: 'title', type: 'string', required: false, desc: 'Optional memory title' }, { name: 'content', type: 'string', required: true, maxLength: 4000, desc: 'Memory content, up to 4000 characters' }],
  risk: 'write',
  dryRun: (ctx) => targetDryRun(ctx, 'POST', 'memories', memoryBody(ctx)),
  execute: (ctx) => targetPost(ctx, 'memories', memoryBody(ctx)),
};
