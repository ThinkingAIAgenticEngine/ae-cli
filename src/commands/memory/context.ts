import type { Command } from '../../framework/types.js';
import { agentId, compact, conversationId, MEMORY_SERVICE, targetDryRun, targetFlags, targetPost } from './shared.js';

export const contextMemory: Command = {
  service: MEMORY_SERVICE,
  command: '+context',
  description: 'Preview the memory context that one Agent would receive',
  flags: [...targetFlags, { name: 'agent-id', type: 'string', required: false, desc: 'Agent ID; defaults to TE_AGENT_CURRENT_AGENT_ID' }, { name: 'limit', type: 'number', required: false, min: 1, max: 50, desc: 'Maximum memories, 1-50' }],
  risk: 'read',
  validate: agentId,
  dryRun: (ctx) => targetDryRun(ctx, 'POST', 'context', compact({ agentId: agentId(ctx), conversationId: conversationId(ctx), limit: ctx.optionalNum('limit') })),
  execute: (ctx) => targetPost(ctx, 'context', compact({ agentId: agentId(ctx), conversationId: conversationId(ctx), limit: ctx.optionalNum('limit') })),
};
