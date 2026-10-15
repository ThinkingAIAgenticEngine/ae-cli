import type { Command } from '../../framework/types.js';
import { conversationId, MEMORY_SERVICE, targetDryRun, targetFlags, targetPost } from './shared.js';

export const extractMemory: Command = {
  service: MEMORY_SERVICE,
  command: '+extract',
  description: 'Start asynchronous memory extraction from an AgentSpace conversation',
  flags: targetFlags,
  risk: 'write',
  validate: (ctx) => { if (!conversationId(ctx)) throw new Error('--conversation-id is required outside an Agent conversation'); },
  dryRun: (ctx) => targetDryRun(ctx, 'POST', 'extract', { conversationId: conversationId(ctx) }),
  execute: (ctx) => targetPost(ctx, 'extract', { conversationId: conversationId(ctx) }),
};
