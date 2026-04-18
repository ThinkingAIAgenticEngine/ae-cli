import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, hasFlag, readOptionalNumber, readOptionalString, requireAllowedValue } from '../utils.js';

const serviceName = 'engage_task';
const toolName = 'query_task_data_detail';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    taskId: ctx.str('task_id'),
    taskType: ctx.str('task_type'),
    detailType: ctx.str('detail_type'),
    startTime: ctx.str('start_time'),
    endTime: ctx.str('end_time'),
  };
  const requestId = readOptionalString(ctx, 'request_id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push_language_code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const taskInstanceId = readOptionalString(ctx, 'task_instance_id');
  if (taskInstanceId) args.taskInstanceId = taskInstanceId;
  const dataDimType = readOptionalString(ctx, 'data_dim_type');
  if (dataDimType) args.dataDimType = dataDimType;
  const retentionType = readOptionalString(ctx, 'retention_type');
  if (retentionType) args.retentionType = retentionType;
  const dataViewType = readOptionalNumber(ctx, 'data_view_type');
  if (dataViewType !== undefined) args.dataViewType = dataViewType;
  const showTimeZone = readOptionalString(ctx, 'show_time_zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const taskDataDetail: Command = {
  service: 'engage',
  command: '+task_data_detail',
  description: 'Query the detailed data report for one task.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task_id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'task_type', type: 'string', required: true, desc: 'Task type: normal or trigger' },
    { name: 'detail_type', type: 'string', required: true, desc: 'Detail type' },
    { name: 'start_time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end_time', type: 'string', required: true, desc: 'End date' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push_language_code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'task_instance_id', type: 'string', required: false, desc: 'Task instance ID' },
    { name: 'data_dim_type', type: 'string', required: false, desc: 'Data dimension type' },
    { name: 'retention_type', type: 'string', required: false, desc: 'Retention type' },
    { name: 'data_view_type', type: 'number', required: false, desc: 'Trigger detail view type' },
    { name: 'show_time_zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const taskType = ctx.str('task_type');
    const detailType = ctx.str('detail_type');
    requireAllowedValue(taskType, ['normal', 'trigger'], 'task_type');
    requireAllowedValue(detailType, ['time', 'instance', 'instance_daily'], 'detail_type');
    if (taskType === 'trigger' && detailType !== 'time') {
      throw new Error('When --task_type is trigger, --detail_type must be time');
    }
    if (detailType === 'instance_daily' && !hasFlag(ctx, 'task_instance_id')) {
      throw new Error('Flag --task_instance_id is required when --detail_type is instance_daily');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
