import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listTags = createMcpCommand({
  command: '+list_tags',
  description: 'List tag metadata with optional query/fields/limit/offset. Query performs fuzzy matching on clusterName, displayName, and remarks. Default returned fields: id, clusterName, displayName, remarks, clusterType, subConditionTabType, progress, usersNum.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Fuzzy match is applied to clusterName, displayName, and remarks.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported fields: id, clusterName, displayName, clusterType, subConditionTabType, progress, usersNum, remarks. Default fields when omitted: id, clusterName, displayName, remarks, clusterType, subConditionTabType, progress, usersNum.' },
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
