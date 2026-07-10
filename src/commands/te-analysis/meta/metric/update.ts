import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataMetricUpdate = createAnalysisCapabilityCommand({
  resource: 'metric',
  command: 'update',
  capabilityId: 'metadata.metric.update',
  description: 'Update metric definition, name, and remark.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
