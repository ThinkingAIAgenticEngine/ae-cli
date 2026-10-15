import type { Command } from '../../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';
import { memberBody } from './shared.js';

export const updateWorkspaceMember: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'member',
  command: 'update',
  description: 'Change a shared AgentSpace member role',
  flags: [...workspaceTargetFlags, { name: 'user-id', type: 'string', required: true, desc: 'Member user ID' }, { name: 'role', type: 'string', required: true, desc: 'ADMIN | MEMBER' }],
  risk: 'high-risk-write',
  preflight: memberBody,
  validate: memberBody,
  dryRun: (ctx) => targetDryRun(ctx, 'PATCH', `/members/${encodeURIComponent(ctx.str('userId'))}`, { role: ctx.str('role'), operationSource: 'ae_cli' }),
  execute: (ctx) => targetCall(ctx, 'PATCH', `/members/${encodeURIComponent(ctx.str('userId'))}`, { role: ctx.str('role'), operationSource: 'ae_cli' }),
};
