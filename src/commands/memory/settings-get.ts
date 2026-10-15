import type { Command } from '../../framework/types.js';
import { conversationId, MEMORY_SERVICE, query, targetDryRun, targetFlags, targetGet } from './shared.js';

export const getMemorySettings: Command = {
  service: MEMORY_SERVICE,
  command: '+settings-get',
  description: 'Get AgentSpace memory extraction settings',
  flags: targetFlags,
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `settings${query({ conversationId: conversationId(ctx) })}`),
  execute: (ctx) => targetGet(ctx, `settings${query({ conversationId: conversationId(ctx) })}`),
};
