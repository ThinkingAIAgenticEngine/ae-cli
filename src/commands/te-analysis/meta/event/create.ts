import {
  createAnalysisMetaCapabilityCommand,
  requiredPayloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventCreate = createAnalysisMetaCapabilityCommand({
  resource: 'event',
  command: 'create',
  capabilityId: 'metadata.event.create',
  description: 'Create super events and optionally associate event properties.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
