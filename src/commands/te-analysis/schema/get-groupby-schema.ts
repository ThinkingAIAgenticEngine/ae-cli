import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getGroupbySchema = createMcpCommand({
  command: '+get_groupby_schema',
  description: 'Get the group-by schema. Returns field definitions and examples for group-by configuration.',
  flags: [

  ],
  risk: 'read',
  buildArgs: (ctx) => ({}),
});
