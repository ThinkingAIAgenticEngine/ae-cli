import type { Command } from '../../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const transferWorkspaceOwner: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'member',
  command: 'transfer-owner',
  description: 'Transfer shared AgentSpace ownership to another member',
  flags: [...workspaceTargetFlags, { name: 'user-id', type: 'string', required: true, desc: 'New owner user ID' }],
  risk: 'high-risk-write',
  dryRun: (ctx) => targetDryRun(ctx, 'PATCH', `/members/${encodeURIComponent(ctx.str('userId'))}`, { role: 'OWNER', operationSource: 'ae_cli' }),
  execute: (ctx) => targetCall(ctx, 'PATCH', `/members/${encodeURIComponent(ctx.str('userId'))}`, { role: 'OWNER', operationSource: 'ae_cli' }),
};
