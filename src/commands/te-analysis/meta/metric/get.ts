import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataMetricGet = createAnalysisCapabilityCommand({
  resource: 'metric',
  command: 'get',
  capabilityId: 'metadata.metric.get',
  description: 'Get metric definition, events, and params.',
  flags: [
    projectIdFlag,
    { name: 'metric-id', type: 'number', required: true, desc: 'Metric ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), metric_id: ctx.num('metric-id') }),
});
