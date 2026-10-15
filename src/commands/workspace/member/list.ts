import type { Command } from '../../../framework/types.js';
import { optional, queryPath, targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const listWorkspaceMembers: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'member',
  command: 'list',
  description: 'List shared AgentSpace members and optional add candidates',
  flags: [...workspaceTargetFlags, { name: 'candidate-query', type: 'string', required: false, desc: 'Optional company-user search text' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', queryPath('/members', { candidateQuery: optional(ctx, 'candidateQuery') })),
  execute: (ctx) => targetCall(ctx, 'GET', queryPath('/members', { candidateQuery: optional(ctx, 'candidateQuery') })),
};
