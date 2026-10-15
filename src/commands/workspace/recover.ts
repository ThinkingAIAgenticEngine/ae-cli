import type { Command } from '../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from './shared.js';
import { workspaceTargetFlags } from './target.js';

export const recoverWorkspace: Command = {
  service: WORKSPACE_SERVICE,
  command: 'recover',
  description: 'Recover the unavailable runtime for an active AgentSpace',
  flags: workspaceTargetFlags,
  risk: 'write',
  dryRun: (ctx) => targetDryRun(ctx, 'POST', '/recover', { operationSource: 'ae_cli' }),
  execute: (ctx) => targetCall(ctx, 'POST', '/recover', { operationSource: 'ae_cli' }),
};
