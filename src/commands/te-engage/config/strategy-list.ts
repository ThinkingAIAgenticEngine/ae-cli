import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalString } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'query_strategy_list';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = { projectId: ctx.num('project_id') };
  const configId = readOptionalString(ctx, 'config_id');
  if (configId) args.configId = configId;
  const strategyUuidList = readOptionalJsonArray(ctx, 'strategy_uuid_list');
  if (strategyUuidList !== undefined) args.strategyUuidList = strategyUuidList;
  return args;
}

export const strategyList: Command = {
  service: 'engage',
  command: '+strategy_list',
  description: 'List strategies under a project or config item.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config_id', type: 'string', required: false, desc: 'Config item ID' },
    { name: 'strategy_uuid_list', type: 'json', required: false, desc: 'Strategy UUID list as JSON array' },
  ],
  risk: 'read',
  validate: (ctx) => {
    readOptionalJsonArray(ctx, 'strategy_uuid_list');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
