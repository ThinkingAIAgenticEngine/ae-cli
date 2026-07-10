import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualEventCreate = createAnalysisCapabilityCommand({
  resource: 'virtual-event',
  command: 'create',
  capabilityId: 'metadata.virtual_event.create',
  description: 'Create a virtual event from events and filters.',
  flags: [
    projectIdFlag,
    payloadFlag,
    { name: 'override', type: 'boolean', required: false, desc: 'Whether to override an existing virtual event rule.' },
  ],
  risk: 'write',
  buildInput: (ctx) => (compactInput({ ...projectInput(ctx), payload: ctx.json('payload'), override: optionalBoolean(ctx, 'override') })),
});
