import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listDashboards = createMcpCommand({
  command: '+list_dashboards',
  description: 'List dashboard metadata accessible to the current user in the project. Supports keyword filtering and returns dashboard IDs, names, descriptions, and related metadata, but not dashboard configuration or report data.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Performs fuzzy matching against dashboard names; if omitted, all accessible dashboards are returned.', alias: 'q' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      query: optionalString(ctx, 'query'),
    }),
});
