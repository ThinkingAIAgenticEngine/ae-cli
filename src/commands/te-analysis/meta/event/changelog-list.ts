import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataEventChangelogList = createAnalysisCapabilityCommand({
  resource: 'event',
  command: 'changelog-list',
  capabilityId: 'metadata.event.changelog_list',
  description: 'List event metadata change logs.',
  flags: [
    projectIdFlag,
    { name: 'event-name', type: 'string', required: true, desc: 'Event name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), event_name: ctx.str('event-name') }),
});
