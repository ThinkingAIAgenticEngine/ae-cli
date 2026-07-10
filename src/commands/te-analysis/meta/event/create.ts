import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventCreate = createAnalysisCapabilityCommand({
  resource: 'event',
  command: 'create',
  capabilityId: 'metadata.event.create',
  description: 'Create super events and optionally associate event properties.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
