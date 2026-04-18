import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'query_flow_list';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return { projectId: ctx.num('project-id') };
}

export const flowList: Command = {
  service: 'te-engage',
  command: '+flow-list',
  description: 'List flows under a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' }],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
