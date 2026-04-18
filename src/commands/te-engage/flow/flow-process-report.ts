import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, hasFlag, readOptionalString, requireAllowedValue, requireOneOfFlags } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'query_flow_process_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    reportType: ctx.str('report-type'),
  };
  const flowId = readOptionalString(ctx, 'flow-id');
  if (flowId) args.flowId = flowId;
  const flowUuid = readOptionalString(ctx, 'flow-uuid');
  if (flowUuid) args.flowUuid = flowUuid;
  const requestId = readOptionalString(ctx, 'request-id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push-language-code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const dataDimType = readOptionalString(ctx, 'data-dim-type');
  if (dataDimType) args.dataDimType = dataDimType;
  const startTime = readOptionalString(ctx, 'start-time');
  if (startTime) args.startTime = startTime;
  const endTime = readOptionalString(ctx, 'end-time');
  if (endTime) args.endTime = endTime;
  const showTimeZone = readOptionalString(ctx, 'show-time-zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const flowProcessReport: Command = {
  service: 'te-engage',
  command: '+flow-process-report',
  description: 'Query the process-level report for a flow.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'report-type', type: 'string', required: true, desc: 'Report type' },
    { name: 'flow-id', type: 'string', required: false, desc: 'Flow ID' },
    { name: 'flow-uuid', type: 'string', required: false, desc: 'Flow UUID' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'data-dim-type', type: 'string', required: false, desc: 'Data dimension type' },
    { name: 'start-time', type: 'string', required: false, desc: 'Start date' },
    { name: 'end-time', type: 'string', required: false, desc: 'End date' },
    { name: 'show-time-zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const reportType = ctx.str('report-type');
    requireAllowedValue(reportType, ['overview', 'detail', 'exit_detail', 'push_detail'], 'report-type');
    requireOneOfFlags(ctx, ['flow-id', 'flow-uuid']);
    if (['detail', 'exit_detail', 'push_detail'].includes(reportType) && (!hasFlag(ctx, 'start-time') || !hasFlag(ctx, 'end-time'))) {
      throw new Error('Flags --start-time and --end-time are required for detail, exit_detail, and push_detail reports');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
