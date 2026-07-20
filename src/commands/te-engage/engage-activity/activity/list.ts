import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Lists operation activities with optional fuzzy match and paging. */
export const activityList = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'list',
  capabilityId: 'engage-activity.activity.list',
  description: 'List operation activities with optional fuzzy match and paging.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'fuzzy-field', type: 'string', required: false, desc: 'Fuzzy match on activity id/name.' },
    { name: 'page', type: 'number', required: false, desc: 'Page number (1-based, default 1).' },
    { name: 'page-size', type: 'number', required: false, desc: 'Page size (default 20).' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    fuzzy_field: ctx.str('fuzzy-field') || undefined,
    page: ctx.optionalNum('page'),
    page_size: ctx.optionalNum('page-size'),
  }),
});
