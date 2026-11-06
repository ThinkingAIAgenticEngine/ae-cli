import { addOptionalBoolean, createExperimentCapabilityCommand } from '../capability-shared.js';

/** Queries an experiment report summary. */
export const reportSummary = createExperimentCapabilityCommand({
  resource: 'report',
  command: 'summary',
  capabilityId: 'experiment.report.summary',
  description: 'Query an experiment report summary.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
    { name: 'force-refresh', type: 'boolean', required: false, desc: 'Force refresh report data.' },
  ],
  risk: 'read',
  buildInput: (ctx) => {
    const input: Record<string, unknown> = {
      project_id: ctx.num('project-id'),
      exp_id: ctx.str('exp-id'),
    };
    addOptionalBoolean(input, ctx, 'force-refresh', 'force_refresh');
    return input;
  },
});
