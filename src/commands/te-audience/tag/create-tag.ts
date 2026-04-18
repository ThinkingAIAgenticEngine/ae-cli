import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const createTag = createMcpCommand({
  command: '+create_tag',
  description: 'Create a user tag definition',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'tag_name', type: 'string', required: true, desc: 'Tag name. Must start with a letter and contain only letters, digits, and underscores. Length: 1-80' },
    { name: 'display_name', type: 'string', required: true, desc: 'Tag display name. Length: 1-80' },
    { name: 'type', type: 'string', required: false, desc: 'Tag type: condition/metric/first_last/sql. Default: condition' },
    { name: 'definition', type: 'json', required: true, desc: 'Tag definition JSON. See +get_tag_definition_schema' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Optional time zone offset, valid range: -12 to 14' },
    { name: 'entity_id', type: 'number', required: false, desc: 'Optional entity ID. Use analysis_meta +list_entities to query' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      tagName: ctx.str('tag_name'),
      displayName: ctx.str('display_name'),
      type: optionalString(ctx, 'type'),
      definition: requiredJsonString(ctx, 'definition'),
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
      entityId: optionalNumber(ctx, 'entity_id'),
    }),
});
