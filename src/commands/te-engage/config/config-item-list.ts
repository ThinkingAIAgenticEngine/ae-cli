import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'query_config_item_list';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return { projectId: ctx.num('project_id') };
}

export const configItemList: Command = {
  service: 'engage',
  command: '+config_item_list',
  description: 'List config items for a project.',
  flags: [{ name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' }],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
