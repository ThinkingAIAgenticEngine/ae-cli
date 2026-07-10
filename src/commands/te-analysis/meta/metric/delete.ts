import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataMetricDelete = createAnalysisCapabilityCommand({
  resource: 'metric',
  command: 'delete',
  capabilityId: 'metadata.metric.delete',
  description: 'Delete a metric.',
  flags: [
    projectIdFlag,
    { name: 'metric-id', type: 'number', required: true, desc: 'Metric ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), metric_id: ctx.num('metric-id') }),
});
