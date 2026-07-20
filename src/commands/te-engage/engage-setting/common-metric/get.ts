import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Gets the full definition of a common metric by its metric_name. */
export const commonMetricGet = createEngageSettingCapabilityCommand({
  resource: 'common-metric',
  command: 'get',
  capabilityId: 'engage-setting.common-metric.get',
  description: 'Get the full definition of a common metric by its metric_name.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'metric-name', type: 'string', required: true, desc: 'Metric name to query.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    metric_name: ctx.str('metric-name'),
  }),
});
