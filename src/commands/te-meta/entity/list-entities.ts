import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listEntities = createMcpCommand({
  command: '+list_entities',
  description: 'List entities in the project. Query performs fuzzy matching on entityName, columnName and columnDesc. Supports fields/limit/offset payload governance.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'event_name', type: 'string', required: false, desc: 'Optional event name filter' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Fuzzy match is applied to entityName, columnName, and columnDesc; if omitted, all entities are returned.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported fields: entityId, entityName, columnName, columnDesc, selectType, tableType, entityType.', alias: 'f' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size. Default: 20, maximum: 50.', alias: 'l' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset. Default: 0.', alias: 'o' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      eventName: optionalString(ctx, 'event_name'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
  }),
});
