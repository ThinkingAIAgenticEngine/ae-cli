import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Removes a task from its topic. */
export const topicRemoveTask = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'remove-task',
  capabilityId: 'engage-activity.topic.remove-task',
  description: 'Remove a task from its topic.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Task ID to remove from its topic.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
  }),
});
