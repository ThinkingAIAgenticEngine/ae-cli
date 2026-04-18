import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalNumber, readOptionalString, readRequiredJsonArray } from '../utils.js';

const serviceName = 'te-engage_config';
const toolName = 'query_config_item_strategy_comparison';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    configId: ctx.str('config-id'),
    strategyIdList: readRequiredJsonArray(ctx, 'strategy-id-list', 2),
  };
  const requestId = readOptionalString(ctx, 'request-id');
  if (requestId) args.requestId = requestId;
  const showTimeZone = readOptionalNumber(ctx, 'show-time-zone');
  if (showTimeZone !== undefined) args.showTimeZone = showTimeZone;
  return args;
}

export const configItemStrategyComparison: Command = {
  service: 'te-engage',
  command: '+config-item-strategy-comparison',
  description: 'Compare multiple strategies under one config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'strategy-id-list', type: 'json', required: true, desc: 'Strategy ID list as JSON array' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'show-time-zone', type: 'number', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    readRequiredJsonArray(ctx, 'strategy-id-list', 2);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
