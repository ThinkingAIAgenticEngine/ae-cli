import type { Command } from '../../../framework/types.js';
import { targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const moveWorkspaceAsset: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'asset',
  command: 'move',
  description: 'Move an AgentSpace file or folder',
  flags: [
    ...workspaceTargetFlags,
    { name: 'path', type: 'string', required: true, desc: 'Current relative path' },
    { name: 'destination', type: 'string', required: true, desc: 'Destination folder path' },
  ],
  risk: 'write',
  dryRun: (ctx) => targetDryRun(ctx, 'PATCH', '/documents', { operation: 'move', path: ctx.str('path'), destination: ctx.str('destination') }),
  execute: (ctx) => targetCall(ctx, 'PATCH', '/documents', { operation: 'move', path: ctx.str('path'), destination: ctx.str('destination') }),
};
