import type { Command } from '../../../framework/types.js';
import { optional, targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const mkdirWorkspaceAsset: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'asset',
  command: 'mkdir',
  description: 'Create a folder in an AgentSpace',
  flags: [
    ...workspaceTargetFlags,
    { name: 'path', type: 'string', required: false, desc: 'Parent folder path; defaults to the root' },
    { name: 'name', type: 'string', required: true, desc: 'New folder name' },
  ],
  risk: 'write',
  dryRun: (ctx) => targetDryRun(ctx, 'POST', '/documents/mkdir', { path: optional(ctx, 'path') ?? '', name: ctx.str('name') }),
  execute: (ctx) => targetCall(ctx, 'POST', '/documents/mkdir', { path: optional(ctx, 'path') ?? '', name: ctx.str('name') }),
};
