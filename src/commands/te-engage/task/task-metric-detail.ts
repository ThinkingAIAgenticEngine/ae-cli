import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalJsonArray, readOptionalNumber, readOptionalString, requireAllowedValue } from '../utils.js';

const serviceName = 'engage_task';
const toolName = 'query_task_metric_detail';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    taskId: ctx.str('task_id'),
    taskType: ctx.str('task_type'),
    startTime: ctx.str('start_time'),
    endTime: ctx.str('end_time'),
  };
  const requestId = readOptionalString(ctx, 'request_id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push_language_code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const metricIdList = readOptionalJsonArray(ctx, 'metric_id_list');
  if (metricIdList !== undefined) args.metricIdList = metricIdList;
  const groupType = readOptionalNumber(ctx, 'group_type');
  if (groupType !== undefined) args.groupType = groupType;
  const showTimeZone = readOptionalString(ctx, 'show_time_zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const taskMetricDetail: Command = {
  service: 'engage',
  command: '+task_metric_detail',
  description: 'Query the metric-oriented detail report for one task.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task_id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'task_type', type: 'string', required: true, desc: 'Task type: normal or trigger' },
    { name: 'start_time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end_time', type: 'string', required: true, desc: 'End date' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push_language_code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'metric_id_list', type: 'json', required: false, desc: 'Metric ID list as JSON array' },
    { name: 'group_type', type: 'number', required: false, desc: 'Grouping type' },
    { name: 'show_time_zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireAllowedValue(ctx.str('task_type'), ['normal', 'trigger'], 'task_type');
    readOptionalJsonArray(ctx, 'metric_id_list');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
