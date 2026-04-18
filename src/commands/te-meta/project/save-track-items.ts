import { createMcpCommand, requiredJsonString } from '../shared.js';

export const saveTrackItems = createMcpCommand({
  command: '+save_track_items',
  description: 'Create or update tracking-plan metadata only',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'track_data', type: 'json', required: true, desc: 'Track program JSON object with events/eventProps/userProps/commonEventProps' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    trackData: requiredJsonString(ctx, 'track_data'),
  }),
});
