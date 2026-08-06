import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Updates metric settings for a flow canvas. */
export const flowMetricUpdate = createEngageFlowCapabilityCommand({
  resource: 'metric',
  command: 'update',
  capabilityId: 'engage-flow.metric.update',
  description: 'Update metric settings for a flow canvas.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'flow-id', type: 'string', required: true, desc: 'Logical flow ID.' },
    {
      name: 'metric-map',
      type: 'json',
      required: true,
      desc: 'Metric configuration map keyed by metric group.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    flow_id: ctx.str('flow-id'),
    metric_map: ctx.json('metric-map'),
  }),
});
