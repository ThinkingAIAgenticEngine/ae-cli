import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Deletes a common metric by its metric_name. */
export const commonMetricDelete = createEngageSettingCapabilityCommand({
  resource: 'common-metric',
  command: 'delete',
  capabilityId: 'engage-setting.common-metric.delete',
  description: 'Delete a common metric by its metric_name.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'metric-name', type: 'string', required: true, desc: 'Metric name to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    metric_name: ctx.str('metric-name'),
  }),
});
