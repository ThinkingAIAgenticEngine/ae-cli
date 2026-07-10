import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualEventDelete = createAnalysisCapabilityCommand({
  resource: 'virtual-event',
  command: 'delete',
  capabilityId: 'metadata.virtual_event.delete',
  description: 'Delete a virtual event rule.',
  flags: [
    projectIdFlag,
    { name: 'v-event-id', type: 'number', required: true, desc: 'Virtual event ID.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), v_event_id: ctx.num('v-event-id') }),
});
