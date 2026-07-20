import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Lists related metrics of a config item. */
export const configMetricList = createEngageSceneCapabilityCommand({
  resource: 'config-metric',
  command: 'list',
  capabilityId: 'engage-scene.config-metric.list',
  description: 'List related metrics of a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'all-metric', type: 'boolean', required: false, desc: 'Include preset metrics as well.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    all_metric: ctx.bool('all-metric') || undefined,
  }),
});
