import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Batch-deletes custom activity types. */
export const activityTypeBatchDelete = createEngageActivityCapabilityCommand({
  resource: 'activity-type',
  command: 'batch-delete',
  capabilityId: 'engage-activity.activity-type.batch-delete',
  description: 'Batch-delete custom activity types (loops single delete).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'ids', type: 'json', required: true, desc: 'JSON array of activity type IDs to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    ids: ctx.json('ids'),
  }),
});
