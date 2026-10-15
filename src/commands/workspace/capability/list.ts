import type { Command } from '../../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const listWorkspaceCapabilities: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'capability',
  command: 'list',
  description: 'List AgentSpace capability settings and their revision',
  flags: workspaceTargetFlags,
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', '/capabilities'),
  execute: (ctx) => targetCall(ctx, 'GET', '/capabilities'),
};
