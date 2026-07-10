import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventUpdate = createAnalysisCapabilityCommand({
  resource: 'event',
  command: 'update',
  capabilityId: 'metadata.event.update',
  description: 'Update event display names and remarks.',
  flags: [
    projectIdFlag,
    { name: 'event-name', type: 'string', required: true, desc: 'Event name.' },
    { name: 'event-desc', type: 'string', required: false, desc: 'Event display name.' },
    { name: 'remark', type: 'string', required: false, desc: 'Event remark.' },
  ],
  risk: 'write',
  buildInput: (ctx) => (compactInput({ ...projectInput(ctx), event_name: ctx.str('event-name'), event_desc: optionalString(ctx, 'event-desc'), remark: optionalString(ctx, 'remark') })),
});
