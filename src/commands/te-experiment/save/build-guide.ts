import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Builds a read-only experiment save guide. */
export const saveBuildGuide = createExperimentCapabilityCommand({
  resource: 'save', command: 'build-guide', capabilityId: 'experiment.save.build-guide',
  description:
    'Build a read-only save guide for feature, traffic layer, experiment, or metric saves. '
    + 'WARNING: data.guide.example_args.req keys are recursively snake_cased for display; '
    + 'do not copy them into --req. Final save DTOs require camelCase '
    + '(e.g. expName). Prefer capability inspect <final-save-id> input_schema.properties.req.',
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
