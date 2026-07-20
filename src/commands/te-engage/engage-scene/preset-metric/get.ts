import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Gets preset metric QP config of a config item. */
export const presetMetricGet = createEngageSceneCapabilityCommand({
  resource: 'preset-metric',
  command: 'get',
  capabilityId: 'engage-scene.preset-metric.get',
  description: 'Get preset metric QP config of a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
  }),
});
