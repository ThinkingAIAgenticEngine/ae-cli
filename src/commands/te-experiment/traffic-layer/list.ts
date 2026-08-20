import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Lists traffic layers in a project. */
export const trafficLayerList = createExperimentCapabilityCommand({
  resource: 'traffic-layer', command: 'list', capabilityId: 'experiment.traffic-layer.list',
  description: 'List traffic layers in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
