import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Queries activity status distribution statistics. */
export const activityStats = createEngageActivityCapabilityCommand({
  resource: 'activity',
  command: 'stats',
  capabilityId: 'engage-activity.activity.stats',
  description: 'Query activity status distribution statistics (draft/working/pending/complete/...).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'fuzzy-field', type: 'string', required: false, desc: 'Fuzzy match on activity id/name.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    fuzzy_field: ctx.str('fuzzy-field') || undefined,
  }),
});
