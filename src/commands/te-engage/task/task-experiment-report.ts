import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString, requireAllowedValue } from '../utils.js';

const serviceName = 'engage_task';
const toolName = 'query_task_experiment_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    taskId: ctx.str('task_id'),
    taskType: ctx.str('task_type'),
    reportType: ctx.str('report_type'),
    startTime: ctx.str('start_time'),
    endTime: ctx.str('end_time'),
  };
  const requestId = readOptionalString(ctx, 'request_id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push_language_code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  return args;
}

export const taskExperimentReport: Command = {
  service: 'engage',
  command: '+task_experiment_report',
  description: 'Query the experiment report for one task.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task_id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'task_type', type: 'string', required: true, desc: 'Task type: normal or trigger' },
    { name: 'report_type', type: 'string', required: true, desc: 'Report type: overview or detail' },
    { name: 'start_time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end_time', type: 'string', required: true, desc: 'End date' },
    { name: 'request_id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push_language_code', type: 'string', required: false, desc: 'Push language code' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireAllowedValue(ctx.str('task_type'), ['normal', 'trigger'], 'task_type');
    requireAllowedValue(ctx.str('report_type'), ['overview', 'detail'], 'report_type');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
