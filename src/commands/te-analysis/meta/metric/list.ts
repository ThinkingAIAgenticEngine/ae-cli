import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalBoolean,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataMetricList = createAnalysisMetaCapabilityCommand({
  resource: 'metric',
  command: 'list',
  capabilityId: 'metadata.metric.list',
  description: 'List project metrics.',
  flags: [
    projectIdFlag,
    { name: 'ignore-authentication', type: 'boolean', required: false, desc: 'Whether to skip asset authentication status decoration.' },
  ],
  risk: 'read',
  buildInput: (ctx) => (compactInput({ ...projectInput(ctx), ignore_authentication: optionalBoolean(ctx, 'ignore-authentication') })),
});
