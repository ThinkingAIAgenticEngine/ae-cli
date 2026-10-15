import type { Command } from '../../../framework/types.js';
import { queryPath, targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const deleteWorkspaceAsset: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'asset',
  command: 'delete',
  description: 'Delete an AgentSpace file or folder',
  flags: [...workspaceTargetFlags, { name: 'path', type: 'string', required: true, desc: 'Relative path to delete' }],
  risk: 'high-risk-write',
  dryRun: (ctx) => targetDryRun(ctx, 'DELETE', queryPath('/documents', { path: ctx.str('path') })),
  execute: (ctx) => targetCall(ctx, 'DELETE', queryPath('/documents', { path: ctx.str('path') })),
};
