import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listProperties = createMcpCommand({
  command: '+list_properties',
  description: 'List properties in the project. Use for explicit metadata inspection, not as a pre-step for event/retention/funnel/prop_analysis ad-hoc builders; the builders resolve property names internally. Query performs fuzzy matching on propName, propDesc and aiRemark. Supports fields/limit/offset payload governance.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'scope', type: 'string', required: false, desc: 'Property scope: event or user' },
    { name: 'event_name', type: 'string', required: false, desc: 'Optional event name filter' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Fuzzy match is applied to propName, propDesc, and aiRemark; if omitted, all accessible properties are returned.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported fields: propName, propDesc, aiRemark, selectType, tableType, subTableType.', alias: 'f' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size. Default: 20, maximum: 50.', alias: 'l' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset. Default: 0.', alias: 'o' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      scope: optionalString(ctx, 'scope'),
      eventName: optionalString(ctx, 'event_name'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
  }),
});
