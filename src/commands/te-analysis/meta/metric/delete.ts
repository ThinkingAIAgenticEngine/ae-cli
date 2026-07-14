import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataMetricDelete = createAnalysisMetaCapabilityCommand({
  resource: 'metric',
  command: 'delete',
  capabilityId: 'metadata.metric.delete',
  description: 'Delete a metric.',
  flags: [
    projectIdFlag,
    { name: 'metric-id', type: 'number', required: true, desc: 'Metric ID.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({ ...projectInput(ctx), metric_id: ctx.num('metric-id') }),
});
