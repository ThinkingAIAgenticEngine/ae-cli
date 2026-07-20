import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Copies an existing standalone task (loads detail, renames, re-creates). */
export const taskCopy = createEngageActivityCapabilityCommand({
  resource: 'task',
  command: 'copy',
  capabilityId: 'engage-activity.task.copy',
  description: 'Copy an existing standalone task (loads detail, renames, re-creates).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Source task ID to copy.' },
    { name: 'new-name', type: 'string', required: false, desc: 'New task name (defaults to source name + _copy).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    new_name: ctx.str('new-name') || undefined,
  }),
});
