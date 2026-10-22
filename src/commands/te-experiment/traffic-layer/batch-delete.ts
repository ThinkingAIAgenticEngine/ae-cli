import { createExperimentCapabilityCommand, readRequiredStringArray } from '../capability-shared.js';

/** Batch deletes traffic layers. */
export const trafficLayerBatchDelete = createExperimentCapabilityCommand({
  resource: 'traffic-layer', command: 'batch-delete', capabilityId: 'experiment.traffic-layer.batch-delete',
  description: 'Batch delete traffic layers.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'layer-ids', type: 'json', required: true, desc: 'Traffic layer IDs as a JSON string array.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { readRequiredStringArray(ctx, 'layer-ids'); },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    layer_ids: readRequiredStringArray(ctx, 'layer-ids'),
  }),
});
