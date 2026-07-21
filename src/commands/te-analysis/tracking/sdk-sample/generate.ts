import {
  createTrackingCapabilityCommand,
  projectIdFlag,
  projectInput,
  sdkTypesFlag,
} from '../shared.js';

export const trackingSdkSampleGenerate = createTrackingCapabilityCommand({
  resource: 'sdk-sample',
  command: 'generate',
  capabilityId: 'tracking.sdk_sample.generate',
  description: 'Submit an AI SDK sample generation task.',
  flags: [projectIdFlag, sdkTypesFlag],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), sdk_types: ctx.json('sdk-types') }),
});
