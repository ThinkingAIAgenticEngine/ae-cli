import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const updateTag = createMcpCommand({
  command: '+update_tag',
  description: 'Update a user tag definition',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'tag_name', type: 'string', required: true, desc: 'Tag name' },
    { name: 'display_name', type: 'string', required: false, desc: 'New tag display name. Length: 1-80' },
    { name: 'remark', type: 'string', required: false, desc: 'New tag remark' },
    { name: 'type', type: 'string', required: false, desc: 'New tag type: condition/metric/first_last/sql' },
    { name: 'definition', type: 'json', required: false, desc: 'New tag definition JSON. See +get_tag_definition_schema' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Optional time zone offset, valid range: -12 to 14' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      tagName: ctx.str('tag_name'),
      displayName: optionalString(ctx, 'display_name'),
      remark: optionalString(ctx, 'remark'),
      type: optionalString(ctx, 'type'),
      definition: optionalJsonString(ctx, 'definition'),
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
    }),
});
