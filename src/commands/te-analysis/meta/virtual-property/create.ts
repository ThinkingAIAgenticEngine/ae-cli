import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualPropertyCreate = createAnalysisCapabilityCommand({
  resource: 'virtual-property',
  command: 'create',
  capabilityId: 'metadata.virtual_property.create',
  description: 'Create a SQL virtual event or user property.',
  flags: [
    projectIdFlag,
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), payload: ctx.json('payload') }),
});
