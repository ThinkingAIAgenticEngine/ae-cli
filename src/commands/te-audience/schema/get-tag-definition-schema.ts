import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getTagDefinitionSchema = createMcpCommand({
  command: '+get_tag_definition_schema',
  description: 'Get the tag definition schema for condition/metric/first_last/sql tags',
  flags: [

  ],
  risk: 'read',
  buildArgs: (ctx) => ({}),
});
