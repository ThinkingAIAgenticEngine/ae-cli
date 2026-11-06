import { createExperimentCapabilityCommand } from '../../capability-shared.js';

/** Queries Feature operation logs for one Feature key. */
export const featureOperationLogQuery = createExperimentCapabilityCommand({
  resource: 'feature operation-log',
  command: 'query',
  capabilityId: 'experiment.feature.operation-log.query',
  description: 'Query Feature operation logs for one Feature key.',
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
