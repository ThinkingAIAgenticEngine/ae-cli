import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalBoolean, readOptionalJsonArray, readOptionalNumber, readOptionalString } from '../utils.js';

const serviceName = 'te-engage_config';
const toolName = 'query_config_item_trigger_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    configId: ctx.str('config-id'),
    startTime: ctx.str('start-time'),
    endTime: ctx.str('end-time'),
  };
  const requestId = readOptionalString(ctx, 'request-id');
  if (requestId) args.requestId = requestId;
  const templateIdList = readOptionalJsonArray(ctx, 'template-id-list');
  if (templateIdList !== undefined) args.templateIdList = templateIdList;
  const strategyIdList = readOptionalJsonArray(ctx, 'strategy-id-list');
  if (strategyIdList !== undefined) args.strategyIdList = strategyIdList;
  const showTimeZone = readOptionalNumber(ctx, 'show-time-zone');
  if (showTimeZone !== undefined) args.showTimeZone = showTimeZone;
  const analyzeReportInternalQuery = readOptionalBoolean(ctx, 'analyze-report-internal-query');
  if (analyzeReportInternalQuery !== undefined) args.analyzeReportInternalQuery = analyzeReportInternalQuery;
  return args;
}

export const configItemTriggerReport: Command = {
  service: 'te-engage',
  command: '+config-item-trigger-report',
  description: 'Query the publish and trigger trend report for a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'template-id-list', type: 'json', required: false, desc: 'Template ID list as JSON array' },
    { name: 'strategy-id-list', type: 'json', required: false, desc: 'Strategy ID list as JSON array' },
    { name: 'show-time-zone', type: 'number', required: false, desc: 'Timezone offset' },
    { name: 'analyze-report-internal-query', type: 'boolean', required: false, desc: 'Internal trigger-report calculation switch' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const templateIdList = readOptionalJsonArray(ctx, 'template-id-list');
    const strategyIdList = readOptionalJsonArray(ctx, 'strategy-id-list');
    if (templateIdList && strategyIdList) {
      throw new Error('Flags --template-id-list and --strategy-id-list cannot be used together');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
