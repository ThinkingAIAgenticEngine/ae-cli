import { createCapabilityCommand } from '../shared.js';

export const eventGet = createCapabilityCommand({
  resource: 'event',
  command: 'get',
  capabilityId: 'metadata.event.get',
  description:
    'Get one super-event metadata detail, including virtual event definitions. Requires metadata view permission in the target project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    {
      name: 'event-name',
      type: 'string',
      required: true,
      desc: 'Super-event technical name. Virtual events use the same field.',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    event_name: ctx.str('event-name'),
  }),
});
