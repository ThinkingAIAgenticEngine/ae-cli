import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString, requireAllowedValue, requireOneOfFlags } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'query_flow_ab_split_node_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    reportType: ctx.str('report-type'),
    nodeUuid: ctx.str('node-uuid'),
    startTime: ctx.str('start-time'),
    endTime: ctx.str('end-time'),
  };
  const flowId = readOptionalString(ctx, 'flow-id');
  if (flowId) args.flowId = flowId;
  const flowUuid = readOptionalString(ctx, 'flow-uuid');
  if (flowUuid) args.flowUuid = flowUuid;
  const requestId = readOptionalString(ctx, 'request-id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push-language-code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const indicatorsUuid = readOptionalString(ctx, 'indicators-uuid');
  if (indicatorsUuid) args.indicatorsUuid = indicatorsUuid;
  const showTimeZone = readOptionalString(ctx, 'show-time-zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const flowAbSplitNodeReport: Command = {
  service: 'te-engage',
  command: '+flow-ab-split-node-report',
  description: 'Query the report for one AB split node.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'report-type', type: 'string', required: true, desc: 'Report type: overview or detail' },
    { name: 'node-uuid', type: 'string', required: true, desc: 'AB split node UUID' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date' },
    { name: 'flow-id', type: 'string', required: false, desc: 'Flow ID' },
    { name: 'flow-uuid', type: 'string', required: false, desc: 'Flow UUID' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'indicators-uuid', type: 'string', required: false, desc: 'Indicator UUID' },
    { name: 'show-time-zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireAllowedValue(ctx.str('report-type'), ['overview', 'detail'], 'report-type');
    requireOneOfFlags(ctx, ['flow-id', 'flow-uuid']);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
