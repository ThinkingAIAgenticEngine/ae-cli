import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Builds a read-only experiment save guide. */
export const saveBuildGuide = createExperimentCapabilityCommand({
  resource: 'save', command: 'build-guide', capabilityId: 'experiment.save.build-guide',
  description: 'Build a read-only save guide for feature, traffic layer, experiment, or metric saves.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'operation-mode', type: 'string', required: true,
      desc: 'Save operation mode: save_feature, save_traffic_layer, save_experiment, or save_metric.',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    const mode = ctx.str('operation-mode');
    if (!['save_feature', 'save_traffic_layer', 'save_experiment', 'save_metric'].includes(mode)) {
      throw new Error('Flag --operation-mode must be one of: save_feature, save_traffic_layer, save_experiment, save_metric');
    }
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    operation_mode: ctx.str('operation-mode'),
  }),
});
