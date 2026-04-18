import { createMcpCommand, requiredJsonString } from '../shared.js';

export const deleteTrackItems = createMcpCommand({
  command: '+delete_track_items',
  description: 'Delete tracking-plan metadata items only',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'delete_data', type: 'json', required: true, desc: 'Delete payload JSON object with events/eventPropNames/userPropNames/commonEventPropNames' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    deleteData: requiredJsonString(ctx, 'delete_data'),
  }),
});
