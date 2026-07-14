import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventGet = createAnalysisMetaCapabilityCommand({
  resource: 'event',
  command: 'get',
  capabilityId: 'metadata.event.get',
  description: 'Get one super event metadata detail.',
  flags: [
    projectIdFlag,
    { name: 'event-name', type: 'string', required: true, desc: 'Event name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), event_name: ctx.str('event-name') }),
});
