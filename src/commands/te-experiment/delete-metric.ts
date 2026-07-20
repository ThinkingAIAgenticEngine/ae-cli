import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    metricId: ctx.str('metric_id'),
  };
}

export const deleteMetric = createExperimentCommand({
  command: '+delete_metric',
  description: 'Delete a metric.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'metric_id', type: 'string', required: true, desc: 'Metric ID' },
  ],
  risk: 'write',
  buildArgs,
});
