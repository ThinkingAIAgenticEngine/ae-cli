import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Lists Feature version history for one Feature key. */
export const featureVersionList = createExperimentCapabilityCommand({
  resource: 'feature',
  command: 'version-list',
  capabilityId: 'experiment.feature.version-list',
  description: 'List Feature version history for one Feature key.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'feature-key', type: 'string', required: true, desc: 'Feature key.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    feature_key: ctx.str('feature-key'),
  }),
});
