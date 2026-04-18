import { createMcpCommand, optionalString } from '../shared.js';

export const listMetrics = createMcpCommand({
  command: '+list_metrics',
  description: 'List metric metadata in the project',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'query', type: 'string', required: false, alias: 'q', desc: 'Optional keyword filter' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    query: optionalString(ctx, 'query'),
  }),
});
