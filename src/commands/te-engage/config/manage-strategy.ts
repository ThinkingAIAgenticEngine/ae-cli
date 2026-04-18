import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalString, readRequiredJsonArray } from '../utils.js';

const serviceName = 'te-engage_config';
const toolName = 'batch_manage_strategy';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    configId: ctx.str('config-id'),
    action: ctx.str('action'),
  };
  const strategyUuidList = readOptionalJsonArray(ctx, 'strategy-uuid-list');
  if (strategyUuidList !== undefined) args.strategyUuidList = strategyUuidList;
  const strategyList = readOptionalJsonArray(ctx, 'strategy-list');
  if (strategyList !== undefined) args.strategyList = strategyList;
  const reason = readOptionalString(ctx, 'reason');
  if (reason) args.reason = reason;
  return args;
}

export const manageStrategy: Command = {
  service: 'te-engage',
  command: '+manage-strategy',
  description: 'Batch manage config strategies.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'action', type: 'string', required: true, desc: 'Action type' },
    { name: 'strategy-uuid-list', type: 'json', required: false, desc: 'Strategy UUID list as JSON array' },
    { name: 'strategy-list', type: 'json', required: false, desc: 'Strategy review list as JSON array' },
    { name: 'reason', type: 'string', required: false, desc: 'Reason for approval actions' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const action = ctx.str('action');
    if (['online', 'offline', 'suspend', 'delete'].includes(action)) {
      readRequiredJsonArray(ctx, 'strategy-uuid-list');
    }
    if (['approve', 'deny', 'cancel'].includes(action)) {
      readRequiredJsonArray(ctx, 'strategy-list');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
