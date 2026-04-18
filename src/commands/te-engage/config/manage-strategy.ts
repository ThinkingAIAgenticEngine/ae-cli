import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalString, readRequiredJsonArray } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'batch_manage_strategy';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    configId: ctx.str('config_id'),
    action: ctx.str('action'),
  };
  const strategyUuidList = readOptionalJsonArray(ctx, 'strategy_uuid_list');
  if (strategyUuidList !== undefined) args.strategyUuidList = strategyUuidList;
  const strategyList = readOptionalJsonArray(ctx, 'strategy_list');
  if (strategyList !== undefined) args.strategyList = strategyList;
  const reason = readOptionalString(ctx, 'reason');
  if (reason) args.reason = reason;
  return args;
}

export const manageStrategy: Command = {
  service: 'engage',
  command: '+manage_strategy',
  description: 'Batch manage config strategies.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config_id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'action', type: 'string', required: true, desc: 'Action type' },
    { name: 'strategy_uuid_list', type: 'json', required: false, desc: 'Strategy UUID list as JSON array' },
    { name: 'strategy_list', type: 'json', required: false, desc: 'Strategy review list as JSON array' },
    { name: 'reason', type: 'string', required: false, desc: 'Reason for approval actions' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const action = ctx.str('action');
    if (['online', 'offline', 'suspend', 'delete'].includes(action)) {
      readRequiredJsonArray(ctx, 'strategy_uuid_list');
    }
    if (['approve', 'deny', 'cancel'].includes(action)) {
      readRequiredJsonArray(ctx, 'strategy_list');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
