import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Updates a config metric's event relation rule. */
export const configMetricUpdateRule = createEngageSceneCapabilityCommand({
  resource: 'config-metric',
  command: 'update-rule',
  capabilityId: 'engage-scene.config-metric.update-rule',
  description: 'Update a config metric\'s event relation rule.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'metric-id', type: 'number', required: true, desc: 'Config metric primary ID.' },
    {
      name: 'event-list',
      type: 'json',
      required: true,
      desc: 'JSON array of event rules. Each item needs event_name or eventName, plus filter ("true"/"false").',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    metric_id: ctx.num('metric-id'),
    event_list: ctx.json('event-list'),
  }),
});
