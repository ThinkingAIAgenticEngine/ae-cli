import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listProperties = createMcpCommand({
  command: '+list_properties',
  description: 'Read-only query for effective system property metadata',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'scope', type: 'string', required: false, desc: 'Property scope: event or user' },
    { name: 'event_name', type: 'string', required: false, desc: 'Optional event name filter' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter', alias: 'q' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      scope: optionalString(ctx, 'scope'),
      eventName: optionalString(ctx, 'event_name'),
      query: optionalString(ctx, 'query'),
    }),
});
