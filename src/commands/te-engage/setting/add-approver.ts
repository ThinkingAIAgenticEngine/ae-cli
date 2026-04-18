import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readRequiredJsonArray } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'batch_add_approver';

function buildArgs(ctx: any): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    approvers: readRequiredJsonArray(ctx, 'approvers'),
  };
}

export const addApprover: Command = {
  service: 'engage',
  command: '+add_approver',
  description: 'Batch add approvers to a project.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'approvers', type: 'json', required: true, desc: 'Approver open ID list as JSON array' },
  ],
  risk: 'write',
  validate: (ctx) => {
    readRequiredJsonArray(ctx, 'approvers');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
