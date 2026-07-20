import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Batch-removes related metrics from a config item. */
export const configMetricBatchDelete = createEngageSceneCapabilityCommand({
  resource: 'config-metric',
  command: 'batch-delete',
  capabilityId: 'engage-scene.config-metric.batch-delete',
  description: 'Batch-remove related metrics from a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'metric-ids', type: 'json', required: true, desc: 'JSON array of config metric primary IDs to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    metric_ids: ctx.json('metric-ids'),
  }),
});
