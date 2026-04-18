import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString, requireAllowedValue } from '../utils.js';

const serviceName = 'te-engage_task';
const toolName = 'query_task_data_overview';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    taskId: ctx.str('task-id'),
    taskType: ctx.str('task-type'),
  };
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

export const taskDataOverview: Command = {
  service: 'te-engage',
  command: '+task-data-overview',
  description: 'Query the high-level data overview for one task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task-id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'task-type', type: 'string', required: true, desc: 'Task type: normal or trigger' },
    { name: 'request-id', type: 'string', required: false, desc: 'Request ID' },
    { name: 'push-language-code', type: 'string', required: false, desc: 'Push language code' },
    { name: 'data-dim-type', type: 'string', required: false, desc: 'Data dimension type' },
    { name: 'show-time-zone', type: 'string', required: false, desc: 'Timezone offset' },
  ],
  risk: 'read',
  validate: (ctx) => {
    requireAllowedValue(ctx.str('task-type'), ['normal', 'trigger'], 'task-type');
  },
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
