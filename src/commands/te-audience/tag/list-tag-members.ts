import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listTagMembers = createMcpCommand({
  command: '+list_tag_members',
  description: 'List members in the specified tag',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'tag_name', type: 'string', required: true, desc: 'Tag name' },
    { name: 'snapshot_date', type: 'string', required: false, desc: 'Optional tag snapshot date, format YYYY-MM-DD' },
    { name: 'property_names', type: 'json', required: false, desc: 'Optional user property name list JSON array' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache, default true' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      tagName: ctx.str('tag_name'),
      snapshotDate: optionalString(ctx, 'snapshot_date'),
      propertyNames: optionalJson(ctx, 'property_names'),
      useCache: optionalBoolean(ctx, 'use_cache'),
    }),
});
