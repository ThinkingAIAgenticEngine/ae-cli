import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listClusters = createMcpCommand({
  command: '+list_clusters',
  description: 'List user cohort/segment cluster metadata with optional query/fields/limit/offset.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Keyword filter', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional return field list JSON array' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size, default 20, max 10000' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset, default 0' },
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
