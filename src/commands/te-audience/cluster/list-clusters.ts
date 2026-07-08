import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listClusters = createMcpCommand({
  command: '+list_clusters',
  description: 'List user cohort/segment cluster metadata with optional authenticated asset filtering, query, fields, limit, and offset. Query performs fuzzy matching on clusterName, displayName, and remarks. Default returned fields: id, clusterName, displayName, remarks, clusterType, progress, usersNum, authenticationStatus.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Fuzzy match is applied to clusterName, displayName, and remarks.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported fields: id, clusterName, displayName, clusterType, progress, usersNum, refreshStatus, remarks, authenticationStatus. Default fields when omitted: id, clusterName, displayName, remarks, clusterType, progress, usersNum, authenticationStatus.' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size, default 20, max 50' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset, default 0' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, return only authenticated clusters.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
      authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
    }),
});
