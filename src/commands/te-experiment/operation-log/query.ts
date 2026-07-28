import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Queries full operation logs for one experiment. */
export const operationLogQuery = createExperimentCapabilityCommand({
  resource: 'operation-log',
  command: 'query',
  capabilityId: 'experiment.operation-log.query',
  description:
    'Query full operation logs for one experiment, including remark and structured changes.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    exp_id: ctx.str('exp-id'),
  }),
});
