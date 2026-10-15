import type { Command } from '../../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const removeWorkspaceMember: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'member',
  command: 'remove',
  description: 'Remove a member from a shared AgentSpace',
  flags: [...workspaceTargetFlags, { name: 'user-id', type: 'string', required: true, desc: 'Member user ID' }],
  risk: 'high-risk-write',
  dryRun: (ctx) => targetDryRun(ctx, 'DELETE', `/members/${encodeURIComponent(ctx.str('userId'))}`),
  execute: (ctx) => targetCall(ctx, 'DELETE', `/members/${encodeURIComponent(ctx.str('userId'))}`),
};
