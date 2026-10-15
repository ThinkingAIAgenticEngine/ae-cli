import type { Command } from '../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from './shared.js';
import { workspaceTargetFlags } from './target.js';

export const deleteWorkspace: Command = {
  service: WORKSPACE_SERVICE,
  command: 'delete',
  description: 'Soft-delete an AgentSpace',
  flags: workspaceTargetFlags,
  risk: 'high-risk-write',
  dryRun: (ctx) => targetDryRun(ctx, 'DELETE', ''),
  execute: (ctx) => targetCall(ctx, 'DELETE', ''),
};
