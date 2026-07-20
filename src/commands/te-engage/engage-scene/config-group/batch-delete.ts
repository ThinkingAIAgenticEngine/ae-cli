import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Batch-deletes config groups by id. */
export const configGroupBatchDelete = createEngageSceneCapabilityCommand({
  resource: 'config-group',
  command: 'batch-delete',
  capabilityId: 'engage-scene.config-group.batch-delete',
  description: 'Batch-delete config groups by id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'group-ids', type: 'json', required: true, desc: 'JSON array of group IDs to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    group_ids: ctx.json('group-ids'),
  }),
});
