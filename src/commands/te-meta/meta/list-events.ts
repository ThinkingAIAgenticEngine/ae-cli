import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listEvents = createMcpCommand({
  command: '+list_events',
  description: 'Read-only query for effective system event metadata',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter', alias: 'q' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      query: optionalString(ctx, 'query'),
    }),
});
