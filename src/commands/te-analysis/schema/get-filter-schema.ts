import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getFilterSchema = createMcpCommand({
  command: '+get_filter_schema',
  description: 'Get the filter schema. Returns field definitions, operator enums, data type descriptions, and examples.',
  flags: [

  ],
  risk: 'read',
  buildArgs: (ctx) => ({}),
});
