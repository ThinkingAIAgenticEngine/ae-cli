import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

/** Creates or updates an experiment metric. */
export const metricSave = createExperimentCapabilityCommand({
  resource: 'metric', command: 'save', capabilityId: 'experiment.metric.save',
  description: 'Create or update an experiment metric.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Native camelCase metric save request object.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequiredObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredObject(ctx, 'req') }),
});
