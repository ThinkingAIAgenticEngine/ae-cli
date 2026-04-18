import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalNumber, readOptionalString, requireAllowedValue } from '../utils.js';

const serviceName = 'te-engage_task';
const toolName = 'query_task_metric_detail';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    taskId: ctx.str('task-id'),
    taskType: ctx.str('task-type'),
    startTime: ctx.str('start-time'),
    endTime: ctx.str('end-time'),
  };
  const requestId = readOptionalString(ctx, 'request-id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push-language-code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const metricIdList = readOptionalJsonArray(ctx, 'metric-id-list');
  if (metricIdList !== undefined) args.metricIdList = metricIdList;
  const groupType = readOptionalNumber(ctx, 'group-type');
  if (groupType !== undefined) args.groupType = groupType;
  const showTimeZone = readOptionalString(ctx, 'show-time-zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const taskMetricDetail: Command = {
  service: 'te-engage',
  command: '+task-metric-detail',
  description: 'Query the metric-oriented detail report for one task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task-id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'task-type', type: 'string', required: true, desc: 'Task type: normal or trigger' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'metric-id-list', type: 'json', required: false, desc: 'Metric ID list as JSON array' },
    { name: 'group-type', type: 'number', required: false, desc: 'Grouping type' },
    { name: 'show-time-zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireAllowedValue(ctx.str('task-type'), ['normal', 'trigger'], 'task-type');
    readOptionalJsonArray(ctx, 'metric-id-list');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
