import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'query_strategy_detail';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    configId: ctx.str('config_id'),
    strategyUuid: ctx.str('strategy_uuid'),
  };
}

export const strategyDetail: Command = {
  service: 'engage',
  command: '+strategy_detail',
  description: 'Get one strategy detail.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config_id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'strategy_uuid', type: 'string', required: true, desc: 'Strategy UUID' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
