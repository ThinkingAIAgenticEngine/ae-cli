import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, hasFlag, readOptionalString, requireAllowedValue, requireOneOfFlags } from '../utils.js';

const serviceName = 'engage_flow';
const toolName = 'query_flow_process_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    reportType: ctx.str('report_type'),
  };
  const flowId = readOptionalString(ctx, 'flow_id');
  if (flowId) args.flowId = flowId;
  const flowUuid = readOptionalString(ctx, 'flow_uuid');
  if (flowUuid) args.flowUuid = flowUuid;
  const requestId = readOptionalString(ctx, 'request_id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push_language_code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const dataDimType = readOptionalString(ctx, 'data_dim_type');
  if (dataDimType) args.dataDimType = dataDimType;
  const startTime = readOptionalString(ctx, 'start_time');
  if (startTime) args.startTime = startTime;
  const endTime = readOptionalString(ctx, 'end_time');
  if (endTime) args.endTime = endTime;
  const showTimeZone = readOptionalString(ctx, 'show_time_zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const flowProcessReport: Command = {
  service: 'engage',
  command: '+flow_process_report',
  description: 'Query the process-level report for a flow.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'report_type', type: 'string', required: true, desc: 'Report type' },
    { name: 'flow_id', type: 'string', required: false, desc: 'Flow ID' },
    { name: 'flow_uuid', type: 'string', required: false, desc: 'Flow UUID' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push_language_code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'data_dim_type', type: 'string', required: false, desc: 'Data dimension type' },
    { name: 'start_time', type: 'string', required: false, desc: 'Start date' },
    { name: 'end_time', type: 'string', required: false, desc: 'End date' },
    { name: 'show_time_zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const reportType = ctx.str('report_type');
    requireAllowedValue(reportType, ['overview', 'detail', 'exit_detail', 'push_detail'], 'report_type');
    requireOneOfFlags(ctx, ['flow_id', 'flow_uuid']);
    if (['detail', 'exit_detail', 'push_detail'].includes(reportType) && (!hasFlag(ctx, 'start_time') || !hasFlag(ctx, 'end_time'))) {
      throw new Error('Flags --start_time and --end_time are required for detail, exit_detail, and push_detail reports');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
