import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString, requireAllowedValue, requireOneOfFlags } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'query_flow_ab_split_node_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    reportType: ctx.str('report_type'),
    nodeUuid: ctx.str('node_uuid'),
    startTime: ctx.str('start_time'),
    endTime: ctx.str('end_time'),
  };
  const flowId = readOptionalString(ctx, 'flow_id');
  if (flowId) args.flowId = flowId;
  const flowUuid = readOptionalString(ctx, 'flow_uuid');
  if (flowUuid) args.flowUuid = flowUuid;
  const requestId = readOptionalString(ctx, 'request_id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push_language_code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const indicatorsUuid = readOptionalString(ctx, 'indicators_uuid');
  if (indicatorsUuid) args.indicatorsUuid = indicatorsUuid;
  const showTimeZone = readOptionalString(ctx, 'show_time_zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const flowAbSplitNodeReport: Command = {
  service: 'engage',
  command: '+flow_ab_split_node_report',
  description: 'Query the report for one AB split node.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'report_type', type: 'string', required: true, desc: 'Report type: overview or detail' },
    { name: 'node_uuid', type: 'string', required: true, desc: 'AB split node UUID' },
    { name: 'start_time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end_time', type: 'string', required: true, desc: 'End date' },
    { name: 'flow_id', type: 'string', required: false, desc: 'Flow ID' },
    { name: 'flow_uuid', type: 'string', required: false, desc: 'Flow UUID' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push_language_code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'indicators_uuid', type: 'string', required: false, desc: 'Indicator UUID' },
    { name: 'show_time_zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireAllowedValue(ctx.str('report_type'), ['overview', 'detail'], 'report_type');
    requireOneOfFlags(ctx, ['flow_id', 'flow_uuid']);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
