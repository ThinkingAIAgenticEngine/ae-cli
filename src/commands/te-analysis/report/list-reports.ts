import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listReports = createMcpCommand({
  command: '+list_reports',
  description: 'List report metadata accessible to the current user in the project. Supports keyword filtering and returns report IDs, names, model types, update times, and related metadata, but not report definitions or analysis data.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Performs fuzzy matching against report names and descriptions; if omitted, all accessible reports are returned.', alias: 'q' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      query: optionalString(ctx, 'query'),
    }),
});
