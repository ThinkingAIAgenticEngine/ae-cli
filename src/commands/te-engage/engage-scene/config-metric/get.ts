import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Gets a related metric's detail. */
export const configMetricGet = createEngageSceneCapabilityCommand({
  resource: 'config-metric',
  command: 'get',
  capabilityId: 'engage-scene.config-metric.get',
  description: 'Get a related metric\'s detail.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'metric-id', type: 'number', required: true, desc: 'Config metric primary ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    metric_id: ctx.num('metric-id'),
  }),
});
