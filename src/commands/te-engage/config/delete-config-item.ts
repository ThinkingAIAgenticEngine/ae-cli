import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'delete_config_item';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    configId: ctx.str('config_id'),
    openId: ctx.str('open_id'),
  };
}

export const deleteConfigItem: Command = {
  service: 'engage',
  command: '+delete_config_item',
  description: 'Delete a config item.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config_id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'open_id', type: 'string', required: true, desc: 'Operator open ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
