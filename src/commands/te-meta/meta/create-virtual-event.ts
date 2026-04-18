import { createMcpCommand, optionalBoolean, optionalJsonString, optionalString, requiredJsonString } from '../shared.js';

export const createVirtualEvent = createMcpCommand({
  command: '+create_virtual_event',
  description: 'Create a virtual event by combining multiple events with optional filters',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'event_name', type: 'string', required: true, desc: "Virtual event name. Must start with 'ta@' and follow the naming constraints in the schema" },
    { name: 'event_desc', type: 'string', required: true, desc: 'Virtual event description' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional remark' },
    { name: 'events', type: 'json', required: true, desc: 'JSON array of events to combine' },
    { name: 'filter', type: 'json', required: false, desc: 'Optional global filter JSON' },
    { name: 'override', type: 'boolean', required: false, desc: 'Whether to override if the event already exists. Default: false' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    eventName: ctx.str('event_name'),
    eventDesc: ctx.str('event_desc'),
    remark: optionalString(ctx, 'remark'),
    events: requiredJsonString(ctx, 'events'),
    filter: optionalJsonString(ctx, 'filter'),
    override: optionalBoolean(ctx, 'override'),
  }),
});
