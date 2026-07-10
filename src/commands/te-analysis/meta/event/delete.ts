import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventDelete = createAnalysisCapabilityCommand({
  resource: 'event',
  command: 'delete',
  capabilityId: 'metadata.event.delete',
  description: 'Batch delete events or virtual events.',
  flags: [
    projectIdFlag,
    { name: 'event-names', type: 'json', required: true, desc: 'Event names JSON array, or a JSON string accepted by common-service.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), event_names: ctx.json('event-names') }),
});
