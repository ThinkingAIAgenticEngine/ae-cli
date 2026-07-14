import {
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyRelatedEvents = createAnalysisMetaCapabilityCommand({
  resource: 'property',
  command: 'related-events',
  capabilityId: 'metadata.property.related_events',
  description: 'List events related to one event property.',
  flags: [
    projectIdFlag,
    { name: 'prop-name', type: 'string', required: true, desc: 'Event property column name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), prop_name: ctx.str('prop-name') }),
});
