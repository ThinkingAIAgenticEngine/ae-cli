import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, hasFlag, readOptionalNumber, readOptionalString, requireAllowedValue } from '../utils.js';

const serviceName = 'te-engage_task';
const toolName = 'query_task_data_detail';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    taskId: ctx.str('task-id'),
    taskType: ctx.str('task-type'),
    detailType: ctx.str('detail-type'),
    startTime: ctx.str('start-time'),
    endTime: ctx.str('end-time'),
  };
  const requestId = readOptionalString(ctx, 'request-id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push-language-code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  const taskInstanceId = readOptionalString(ctx, 'task-instance-id');
  if (taskInstanceId) args.taskInstanceId = taskInstanceId;
  const dataDimType = readOptionalString(ctx, 'data-dim-type');
  if (dataDimType) args.dataDimType = dataDimType;
  const retentionType = readOptionalString(ctx, 'retention-type');
  if (retentionType) args.retentionType = retentionType;
  const dataViewType = readOptionalNumber(ctx, 'data-view-type');
  if (dataViewType !== undefined) args.dataViewType = dataViewType;
  const showTimeZone = readOptionalString(ctx, 'show-time-zone');
  if (showTimeZone) args.showTimeZone = showTimeZone;
  return args;
}

export const taskDataDetail: Command = {
  service: 'te-engage',
  command: '+task-data-detail',
  description: 'Query the detailed data report for one task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task-id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'task-type', type: 'string', required: true, desc: 'Task type: normal or trigger' },
    { name: 'detail-type', type: 'string', required: true, desc: 'Detail type' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'task-instance-id', type: 'string', required: false, desc: 'Task instance ID' },
    { name: 'data-dim-type', type: 'string', required: false, desc: 'Data dimension type' },
    { name: 'retention-type', type: 'string', required: false, desc: 'Retention type' },
    { name: 'data-view-type', type: 'number', required: false, desc: 'Trigger detail view type' },
    { name: 'show-time-zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const taskType = ctx.str('task-type');
    const detailType = ctx.str('detail-type');
    requireAllowedValue(taskType, ['normal', 'trigger'], 'task-type');
    requireAllowedValue(detailType, ['time', 'instance', 'instance_daily'], 'detail-type');
    if (taskType === 'trigger' && detailType !== 'time') {
      throw new Error('When --task-type is trigger, --detail-type must be time');
    }
    if (detailType === 'instance_daily' && !hasFlag(ctx, 'task-instance-id')) {
      throw new Error('Flag --task-instance-id is required when --detail-type is instance_daily');
    }
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
