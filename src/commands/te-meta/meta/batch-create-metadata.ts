import { createMcpCommand, optionalJson } from '../shared.js';

export const batchCreateMetadata = createMcpCommand({
  command: '+batch_create_metadata',
  description: 'Batch create effective system metadata only',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'events', type: 'json', required: false, desc: 'Event creation list JSON array' },
    { name: 'event_properties', type: 'json', required: false, desc: 'Event property creation list JSON array' },
    { name: 'user_properties', type: 'json', required: false, desc: 'User property creation list JSON array' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    events: optionalJson(ctx, 'events'),
    eventProperties: optionalJson(ctx, 'event_properties'),
    userProperties: optionalJson(ctx, 'user_properties'),
  }),
});
