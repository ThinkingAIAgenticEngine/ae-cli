import type { Command } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_setting';
const toolName = 'query_whitelist_list';

function buildArgs(ctx: any): Record<string, any> {
  return { projectId: ctx.num('project_id') };
}

export const whitelistList: Command = {
  service: 'engage',
  command: '+whitelist_list',
  description: 'List whitelist entries for a project.',
  flags: [{ name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' }],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
