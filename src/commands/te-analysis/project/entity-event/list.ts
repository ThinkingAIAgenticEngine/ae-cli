import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectEntityEventList = createAnalysisCapabilityCommand({
  resource: 'project entity-event',
  command: 'list',
  capabilityId: 'project.entity_event.list',
  description: 'List entity mappings for events.',
  flags: [
    projectIdFlag,
    { name: 'event-names', type: 'json', required: false, desc: 'Optional event names JSON array to resolve entity mappings for.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    event_names: optionalJson(ctx, 'event-names'),
  }),
});
