import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Batch-relates TA metrics to a config item. */
export const configMetricBatchAdd = createEngageSceneCapabilityCommand({
  resource: 'config-metric',
  command: 'batch-add',
  capabilityId: 'engage-scene.config-metric.batch-add',
  description: 'Batch-relate TA metrics (event-analysis metrics) to a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'ta-metric-ids', type: 'json', required: true, desc: 'JSON array of TA metric IDs to relate.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    ta_metric_ids: ctx.json('ta-metric-ids'),
  }),
});
