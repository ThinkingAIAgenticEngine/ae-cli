import { createMcpCommand, optionalJson, optionalNumber, optionalString } from '../shared.js';

export const listPublicAccessLinks = createMcpCommand({
  command: '+list_public_access_links',
  description: 'List public access links in the project. Query performs fuzzy matching on shorter and remarks. Supports fields/limit/offset pagination.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'query', type: 'string', required: false, alias: 'q', desc: 'Optional keyword filter. Fuzzy match on shorter and remarks.' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported: id, shorter, creator, projectIdAndName, source, accessId, target, options, remarks, accessStatus, effectTime, expireTime, createTime, updateTime.' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional limit. Default: 20, maximum: 50.' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional offset. Default: 0.' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
