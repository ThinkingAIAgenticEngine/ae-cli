import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Gets one traffic layer by ID. */
export const trafficLayerGet = createExperimentCapabilityCommand({
  resource: 'traffic-layer', command: 'get', capabilityId: 'experiment.traffic-layer.get',
  description: 'Get one traffic layer by ID.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'layer-id', type: 'string', required: true, desc: 'Traffic layer ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), layer_id: ctx.str('layer-id') }),
});
