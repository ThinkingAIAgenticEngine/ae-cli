import type { Command } from '../../../framework/types.js';
import { optional, queryPath, targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const listWorkspaceAssets: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'asset',
  command: 'list',
  description: 'List files and folders in an AgentSpace',
  flags: [...workspaceTargetFlags, { name: 'path', type: 'string', required: false, desc: 'Relative folder path; defaults to the root' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', queryPath('/documents', { path: optional(ctx, 'path') })),
  execute: (ctx) => targetCall(ctx, 'GET', queryPath('/documents', { path: optional(ctx, 'path') })),
};
