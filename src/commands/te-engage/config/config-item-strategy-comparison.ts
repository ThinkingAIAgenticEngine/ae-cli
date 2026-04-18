import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalNumber, readOptionalString, readRequiredJsonArray } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'query_config_item_strategy_comparison';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    configId: ctx.str('config_id'),
    strategyIdList: readRequiredJsonArray(ctx, 'strategy_id_list', 2),
  };
  const requestId = readOptionalString(ctx, 'request_id');
  if (requestId) args.requestId = requestId;
  const showTimeZone = readOptionalNumber(ctx, 'show_time_zone');
  if (showTimeZone !== undefined) args.showTimeZone = showTimeZone;
  return args;
}

export const configItemStrategyComparison: Command = {
  service: 'engage',
  command: '+config_item_strategy_comparison',
  description: 'Compare multiple strategies under one config item.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config_id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'strategy_id_list', type: 'json', required: true, desc: 'Strategy ID list as JSON array' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'show_time_zone', type: 'number', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    readRequiredJsonArray(ctx, 'strategy_id_list', 2);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
