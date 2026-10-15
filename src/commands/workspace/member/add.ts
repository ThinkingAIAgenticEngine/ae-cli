import type { Command } from '../../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';
import { memberBody } from './shared.js';

export const addWorkspaceMember: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'member',
  command: 'add',
  description: 'Add a company user to a shared AgentSpace',
  flags: [...workspaceTargetFlags, { name: 'user-id', type: 'string', required: true, desc: 'Company user ID' }, { name: 'role', type: 'string', required: true, desc: 'ADMIN | MEMBER' }],
  risk: 'high-risk-write',
  preflight: memberBody,
  validate: memberBody,
  dryRun: (ctx) => targetDryRun(ctx, 'POST', '/members', memberBody(ctx)),
  execute: (ctx) => targetCall(ctx, 'POST', '/members', memberBody(ctx)),
};
