import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataVirtualEventGet = createAnalysisCapabilityCommand({
  resource: 'virtual-event',
  command: 'get',
  capabilityId: 'metadata.virtual_event.get',
  description: 'Get virtual event rule.',
  flags: [
    projectIdFlag,
    { name: 'v-event-id', type: 'number', required: true, desc: 'Virtual event ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), v_event_id: ctx.num('v-event-id') }),
});
