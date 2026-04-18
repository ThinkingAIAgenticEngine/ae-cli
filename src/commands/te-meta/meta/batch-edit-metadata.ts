import { createMcpCommand } from '../shared.js';

export const batchEditMetadata = createMcpCommand({
  command: '+batch_edit_metadata',
  description: 'Batch edit effective system metadata only',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'type', type: 'string', required: true, desc: 'Metadata type: event, event_property, or user_property' },
    { name: 'items', type: 'json', required: true, desc: 'Batch edit item list JSON array' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    type: ctx.str('type'),
    items: ctx.json('items'),
  }),
});
