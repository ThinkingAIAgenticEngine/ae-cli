import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildMcpDryRun, executeMcpCommand, readOptionalString } from '../utils.js';

const serviceName = 'te-engage_task';
const toolName = 'manage_task';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project-id'),
    taskId: ctx.str('task-id'),
    action: ctx.str('action'),
  };
  const reason = readOptionalString(ctx, 'reason');
  if (reason) args.reason = reason;
  return args;
}

export const manageTask: Command = {
  service: 'te-engage',
  command: '+manage-task',
  description: 'Manage a task lifecycle action.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'task-id', type: 'string', required: true, desc: 'Task ID' },
    { name: 'action', type: 'string', required: true, desc: 'Action to perform' },
    { name: 'reason', type: 'string', required: false, desc: 'Reason for review actions' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildMcpDryRun(ctx, serviceName, toolName, buildArgs(ctx)),
  execute: async (ctx) => executeMcpCommand(ctx, serviceName, toolName, buildArgs(ctx)),
};
