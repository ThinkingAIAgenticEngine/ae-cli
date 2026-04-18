import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString } from '../utils.js';

const serviceName = 'engage_task';
const toolName = 'manage_task';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    taskId: ctx.str('task_id'),
    action: ctx.str('action'),
  };
  const reason = readOptionalString(ctx, 'reason');
  if (reason) args.reason = reason;
  return args;
}

export const manageTask: Command = {
  service: 'engage',
  command: '+manage_task',
  description: 'Manage a task lifecycle action.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task_id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'action', type: 'string', required: true, desc: 'Action to perform' },
    { name: 'reason', type: 'string', required: false, desc: 'Reason for review actions' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
