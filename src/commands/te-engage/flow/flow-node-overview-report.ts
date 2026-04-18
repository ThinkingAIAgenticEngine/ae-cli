import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString, requireOneOfFlags } from '../utils.js';

const serviceName = 'te-engage_flow';
const toolName = 'query_flow_node_overview_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
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
  const dataDimType = readOptionalString(ctx, 'data-dim-type');
  if (dataDimType) args.dataDimType = dataDimType;
  const showTimeZone = readOptionalString(ctx, 'show-time-zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const flowNodeOverviewReport: Command = {
  service: 'te-engage',
  command: '+flow-node-overview-report',
  description: 'Query the node-level overview report for all nodes in a flow.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date' },
    { name: 'flow-id', type: 'string', required: false, desc: 'Flow ID' },
    { name: 'flow-uuid', type: 'string', required: false, desc: 'Flow UUID' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'data-dim-type', type: 'string', required: false, desc: 'Data dimension type' },
    { name: 'show-time-zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireOneOfFlags(ctx, ['flow-id', 'flow-uuid']);
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
