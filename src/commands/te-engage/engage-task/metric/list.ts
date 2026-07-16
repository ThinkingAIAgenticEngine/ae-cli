import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Lists metric settings for an engagement task. */
export const metricList = createEngageTaskCapabilityCommand({
  resource: 'metric',
  command: 'list',
  capabilityId: 'engage-task.metric.list',
  description: 'List metric settings configured for an engagement task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
  }),
});
