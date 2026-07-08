import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listEvents = createMcpCommand({
  command: '+list_events',
  description: 'List events in the project. Use for explicit metadata inspection, not as a pre-step for event/retention/funnel/prop_analysis ad-hoc builders; the builders resolve event names internally. Query performs fuzzy matching on eventName, eventDesc, and remark. Supports authenticated asset filtering plus fields/limit/offset payload governance. Default returned fields: eventId, eventName, eventDesc, remark, authenticationStatus.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter. Fuzzy match is applied to eventName, eventDesc, and remark; if omitted, all events are returned.', alias: 'q' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported fields: eventId, eventName, eventDesc, remark, eventTag, authenticationStatus. Default fields when omitted: eventId, eventName, eventDesc, remark, authenticationStatus.', alias: 'f' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size. Default: 20, maximum: 50.', alias: 'l' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset. Default: 0.', alias: 'o' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, return only authenticated events.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
      authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
  }),
});
