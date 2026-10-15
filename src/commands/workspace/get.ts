import type { Command } from '../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from './shared.js';
import { workspaceTargetFlags, workspaceTargetPath } from './target.js';

export const getWorkspace: Command = {
  service: WORKSPACE_SERVICE,
  command: 'get',
  description: 'Get the resolved AgentSpace profile and access role',
  flags: workspaceTargetFlags,
  risk: 'read',
  validate: (ctx) => { workspaceTargetPath(ctx); },
  dryRun: (ctx) => targetDryRun(ctx, 'GET', ''),
  execute: (ctx) => targetCall(ctx, 'GET', ''),
};
