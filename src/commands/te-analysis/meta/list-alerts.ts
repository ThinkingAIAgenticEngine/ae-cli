import { createMcpCommand, optionalNumber, optionalString } from '../shared.js';

export const listAlerts = createMcpCommand({
  command: '+list_alerts',
  description: 'List all alerts in the project. Supports keyword filtering by alert name and returns a paginated alert list with total count.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'query', type: 'string', required: false, alias: 'q', desc: 'Optional keyword filter. Performs fuzzy matching against alert names; if omitted, all alerts are returned.' },
    { name: 'limit', type: 'number', required: false, alias: 'l', desc: 'Optional page size. Default: 20, maximum: 50.' },
    { name: 'offset', type: 'number', required: false, alias: 'o', desc: 'Optional page offset. Default: 0.' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    query: optionalString(ctx, 'query'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
