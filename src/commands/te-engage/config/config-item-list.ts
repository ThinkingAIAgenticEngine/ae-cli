import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_config';
const toolName = 'query_config_item_list';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return { projectId: ctx.num('project-id') };
}

export const configItemList: Command = {
  service: 'te-engage',
  command: '+config-item-list',
  description: 'List config items for a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' }],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
