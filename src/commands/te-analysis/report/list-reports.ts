import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listReports = createMcpCommand({
  command: '+list_reports',
  description: 'List report metadata accessible to the current user in the project. Supports keyword filtering and returns paginated report summaries with selectable fields.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Performs fuzzy matching against report names, descriptions, and AI remarks; if omitted, all accessible reports are returned.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported fields: reportId, reportName, reportDesc, reportModel, aiRemark.', alias: 'f' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size. Default: 20, maximum: 50.', alias: 'l' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset. Default: 0.', alias: 'o' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
    }),
});
