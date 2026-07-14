import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventInfluenceList = createAnalysisMetaCapabilityCommand({
  resource: 'event',
  command: 'influence-list',
  capabilityId: 'metadata.event.influence_list',
  description: 'List assets affected by event delete, hide, or update.',
  flags: [
    projectIdFlag,
    { name: 'event-name', type: 'string', required: true, desc: 'Event name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), event_name: ctx.str('event-name') }),
});
