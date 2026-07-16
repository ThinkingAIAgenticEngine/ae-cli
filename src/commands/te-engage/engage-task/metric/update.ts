import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Updates metric settings for an engagement task. */
export const metricUpdate = createEngageTaskCapabilityCommand({
  resource: 'metric',
  command: 'update',
  capabilityId: 'engage-task.metric.update',
  description: 'Update metric settings for an engagement task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
    {
      name: 'metric-map',
      type: 'json',
      required: true,
      desc: 'Metric configuration map keyed by metric group.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    metric_map: ctx.json('metric-map'),
  }),
});
