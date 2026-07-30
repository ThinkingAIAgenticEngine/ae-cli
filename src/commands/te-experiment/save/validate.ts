import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

/** Dry-run validation for experiment save requests. */
export const saveValidate = createExperimentCapabilityCommand({
  resource: 'save', command: 'validate', capabilityId: 'experiment.save.validate',
  description: 'Dry-run validation for feature, traffic layer, experiment, or metric save requests.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'operation-mode', type: 'string', required: true,
      desc: 'Save operation mode: save_feature, save_traffic_layer, save_experiment, or save_metric.',
    },
    { name: 'req', type: 'json', required: true, desc: 'Candidate camelCase save request object.' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const mode = ctx.str('operation-mode');
    if (!['save_feature', 'save_traffic_layer', 'save_experiment', 'save_metric'].includes(mode)) {
      throw new Error('Flag --operation-mode must be one of: save_feature, save_traffic_layer, save_experiment, save_metric');
    }
    readRequiredObject(ctx, 'req');
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    operation_mode: ctx.str('operation-mode'),
    req: readRequiredObject(ctx, 'req'),
  }),
});
