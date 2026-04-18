import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString, requireAllowedValue } from '../utils.js';

const serviceName = 'te-engage_task';
const toolName = 'query_task_experiment_report';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    taskId: ctx.str('task-id'),
    taskType: ctx.str('task-type'),
    reportType: ctx.str('report-type'),
    startTime: ctx.str('start-time'),
    endTime: ctx.str('end-time'),
  };
  const requestId = readOptionalString(ctx, 'request-id');
  if (requestId) args.requestId = requestId;
  const pushLanguageCode = readOptionalString(ctx, 'push-language-code');
  if (pushLanguageCode) args.pushLanguageCode = pushLanguageCode;
  return args;
}

export const taskExperimentReport: Command = {
  service: 'te-engage',
  command: '+task-experiment-report',
  description: 'Query the experiment report for one task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task-id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'task-type', type: 'string', required: true, desc: 'Task type: normal or trigger' },
    { name: 'report-type', type: 'string', required: true, desc: 'Report type: overview or detail' },
    { name: 'start-time', type: 'string', required: true, desc: 'Start date' },
    { name: 'end-time', type: 'string', required: true, desc: 'End date' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireAllowedValue(ctx.str('task-type'), ['normal', 'trigger'], 'task-type');
    requireAllowedValue(ctx.str('report-type'), ['overview', 'detail'], 'report-type');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
