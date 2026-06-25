import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listEvents = createMcpCommand({
  command: '+list_events',
  description: 'List events in the project. Use for explicit metadata inspection, not as a pre-step for event/retention/funnel/prop_analysis ad-hoc builders; the builders resolve event names internally. Query performs fuzzy matching on eventName, eventDesc and aiRemark. Supports fields/limit/offset payload governance.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Fuzzy match is applied to eventName, eventDesc, and aiRemark; if omitted, all events are returned.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported fields: eventName, eventDesc, aiRemark, eventTag, remark.', alias: 'f' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size. Default: 20, maximum: 10000.', alias: 'l' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset. Default: 0.', alias: 'o' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
  }),
});
