import { createEngageTaskCapabilityCommand } from '../../shared.js';
import { readOptionalString } from '../../utils.js';

/** Manages a task lifecycle action. */
export const taskManage = createEngageTaskCapabilityCommand({
  resource: 'task', command: 'manage', capabilityId: 'engage-task.task.manage', description: 'Manage a task lifecycle action.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
    { name: 'action', type: 'string', required: true, desc: 'send, pause, end, approve, deny, or cancel.' },
    { name: 'reason', type: 'string', required: false, desc: 'Review reason.' }],
  risk: 'write',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), task_id: ctx.str('task-id'), action: ctx.str('action'),
    ...(readOptionalString(ctx, 'reason') !== undefined && { reason: readOptionalString(ctx, 'reason') }) }),
});
