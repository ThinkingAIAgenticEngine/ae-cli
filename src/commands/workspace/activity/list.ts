import type { Command } from '../../../framework/types.js';
import { queryPath, targetCall, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { workspaceTargetFlags } from '../target.js';

export const listWorkspaceActivities: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'activity',
  command: 'list',
  description: 'List recent AgentSpace activities',
  flags: [...workspaceTargetFlags, { name: 'limit', type: 'number', required: false, default: 8, min: 1, max: 20, desc: 'Maximum activities, 1-20; default 8' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', queryPath('/activities', { limit: ctx.num('limit') || 8 })),
  execute: (ctx) => targetCall(ctx, 'GET', queryPath('/activities', { limit: ctx.num('limit') || 8 })),
};
