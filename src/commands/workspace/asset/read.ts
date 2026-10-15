import type { Command } from '../../../framework/types.js';
import { queryPath, targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const readWorkspaceAsset: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'asset',
  command: 'read',
  description: 'Read a text file from an AgentSpace',
  flags: [...workspaceTargetFlags, { name: 'path', type: 'string', required: true, desc: 'Relative file path' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', queryPath('/documents/content', { path: ctx.str('path') })),
  execute: (ctx) => targetCall(ctx, 'GET', queryPath('/documents/content', { path: ctx.str('path') })),
};
