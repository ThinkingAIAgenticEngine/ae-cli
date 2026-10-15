import type { Command } from '../../framework/types.js';
import { buildWorkspaceCliUrl } from './client.js';
import { WORKSPACE_SERVICE } from './shared.js';
import { resolveWorkspaceTarget, workspaceTargetFlags, workspaceTargetPath } from './target.js';

export const currentWorkspace: Command = {
  service: WORKSPACE_SERVICE,
  command: 'current',
  description: 'Resolve the current AgentSpace from an explicit ID or conversation context',
  flags: workspaceTargetFlags,
  risk: 'read',
  validate: (ctx) => { workspaceTargetPath(ctx); },
  dryRun: (ctx) => ({ method: 'GET', url: buildWorkspaceCliUrl(ctx, workspaceTargetPath(ctx)) }),
  execute: (ctx) => resolveWorkspaceTarget(ctx),
};
