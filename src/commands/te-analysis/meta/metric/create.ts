import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataMetricCreate = createAnalysisCapabilityCommand({
  resource: 'metric',
  command: 'create',
  capabilityId: 'metadata.metric.create',
  description: 'Create a metric from event or retention analysis configuration.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
