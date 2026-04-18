import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalNumber, readOptionalString } from '../utils.js';

const serviceName = 'engage_config';
const toolName = 'query_config_item_analysis_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    configId: ctx.str('config_id'),
    startTime: ctx.str('start_time'),
    endTime: ctx.str('end_time'),
  };
  const requestId = readOptionalString(ctx, 'request_id');
  if (requestId) args.requestId = requestId;
  const templateIdList = readOptionalJsonArray(ctx, 'template_id_list');
  if (templateIdList !== undefined) args.templateIdList = templateIdList;
  const strategyIdList = readOptionalJsonArray(ctx, 'strategy_id_list');
  if (strategyIdList !== undefined) args.strategyIdList = strategyIdList;
  const showTimeZone = readOptionalNumber(ctx, 'show_time_zone');
  if (showTimeZone !== undefined) args.showTimeZone = showTimeZone;
  return args;
}

export const configItemAnalysisReport: Command = {
  service: 'engage',
  command: '+config_item_analysis_report',
  description: 'Query the analysis report for a config item.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config_id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'start_time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end_time', type: 'string', required: true, desc: 'End date' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'template_id_list', type: 'json', required: false, desc: 'Template ID list as JSON array' },
    { name: 'strategy_id_list', type: 'json', required: false, desc: 'Strategy ID list as JSON array' },
    { name: 'show_time_zone', type: 'number', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const templateIdList = readOptionalJsonArray(ctx, 'template_id_list');
    const strategyIdList = readOptionalJsonArray(ctx, 'strategy_id_list');
    if (templateIdList && strategyIdList) {
      throw new Error('Flags --template_id_list and --strategy_id_list cannot be used together');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
