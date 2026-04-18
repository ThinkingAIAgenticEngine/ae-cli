import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_config';
const toolName = 'query_config_item_detail';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    configId: ctx.str('config-id'),
  };
}

export const configItemDetail: Command = {
  service: 'te-engage',
  command: '+config-item-detail',
  description: 'Get config item detail.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
