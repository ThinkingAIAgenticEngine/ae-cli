import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryEntityDetails = createMcpCommand({
  command: '+query_entity_details',
  description: 'Query entity detail data based on an entity ID and cluster definition. Supports display properties, sorting, and result limits.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'entity_id', type: 'number', required: false, desc: 'Optional entity ID used in multi-entity scenarios. If omitted, the default user entity is used.' },
    { name: 'definition', type: 'json', required: true, desc: 'Cluster definition JSON. See +get_cluster_definition_schema for the structure.' },
    { name: 'properties', type: 'json', required: false, desc: 'Optional display properties JSON' },
    { name: 'sort_by', type: 'string', required: false, desc: 'Optional sort field' },
    { name: 'sort_order', type: 'string', required: false, desc: 'Optional sort order. Supported values: asc and desc' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional result limit. Default: 1000, maximum: 10000' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Time zone offset. For example, UTC+8 is 8' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      entityId: optionalNumber(ctx, 'entity_id'),
      definition: requiredJsonString(ctx, 'definition'),
      properties: optionalJsonString(ctx, 'properties'),
      sortBy: optionalString(ctx, 'sort_by'),
      sortOrder: optionalString(ctx, 'sort_order'),
      limit: optionalNumber(ctx, 'limit'),
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
      useCache: optionalBoolean(ctx, 'use_cache'),
    }),
});
