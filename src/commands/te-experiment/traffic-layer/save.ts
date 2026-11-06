import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

/** Creates or updates a traffic layer. */
export const trafficLayerSave = createExperimentCapabilityCommand({
  resource: 'traffic-layer', command: 'save', capabilityId: 'experiment.traffic-layer.save',
  description: 'Create or update a traffic layer.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Native camelCase traffic layer save request object.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequiredObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredObject(ctx, 'req') }),
});
