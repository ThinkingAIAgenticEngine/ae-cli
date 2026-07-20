import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Batch-adds custom activity types. */
export const activityTypeBatchAdd = createEngageActivityCapabilityCommand({
  resource: 'activity-type',
  command: 'batch-add',
  capabilityId: 'engage-activity.activity-type.batch-add',
  description: 'Batch-add custom activity types (loops single add).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'type-names', type: 'json', required: true, desc: 'JSON array of custom activity type names.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    type_names: ctx.json('type-names'),
  }),
});
