import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_setting';
const toolName = 'query_approver_list';

function buildArgs(ctx: any): Record<string, any> {
  return { projectId: ctx.num('project-id') };
}

export const approverList: Command = {
  service: 'te-engage',
  command: '+approver-list',
  description: 'List approvers for a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' }],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
