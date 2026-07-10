import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventHideUpdate = createAnalysisCapabilityCommand({
  resource: 'event',
  command: 'hide-update',
  capabilityId: 'metadata.event.hide_update',
  description: 'Batch hide or show events.',
  flags: [
    projectIdFlag,
    { name: 'event-names', type: 'json', required: true, desc: 'Event names JSON array, or a JSON string accepted by common-service.' },
    { name: 'is-hide', type: 'boolean', required: true, desc: 'Whether to hide the events.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), event_names: ctx.json('event-names'), is_hide: ctx.bool('is-hide') }),
});
