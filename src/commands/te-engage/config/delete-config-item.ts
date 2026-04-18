import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'te-engage_config';
const toolName = 'delete_config_item';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project-id'),
    configId: ctx.str('config-id'),
    openId: ctx.str('open-id'),
  };
}

export const deleteConfigItem: Command = {
  service: 'te-engage',
  command: '+delete-config-item',
  description: 'Delete a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'open-id', type: 'string', required: true, desc: 'Operator open ID' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
