import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listEntities = createMcpCommand({
  command: '+list_entities',
  description: 'List entities in the project',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'event_name', type: 'string', required: false, desc: 'Optional event name filter' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      eventName: optionalString(ctx, 'event_name'),
    }),
});
