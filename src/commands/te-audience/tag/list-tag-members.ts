import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listTagMembers = createMcpCommand({
  command: '+list_tag_members',
  description: 'List members in the specified tag with optional query/fields/limit/offset',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'tag_name', type: 'string', required: true, desc: 'Tag name' },
    { name: 'snapshot_date', type: 'string', required: false, desc: 'Optional tag snapshot date, format YYYY-MM-DD' },
    { name: 'property_names', type: 'json', required: false, desc: 'Optional user property name list JSON array' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache, default true' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter on #user_id and selected properties' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional return field list JSON array' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size, default 20, max 50' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset, default 0' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      tagName: ctx.str('tag_name'),
      snapshotDate: optionalString(ctx, 'snapshot_date'),
      propertyNames: optionalJson(ctx, 'property_names'),
      useCache: optionalBoolean(ctx, 'use_cache'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
    }),
});
