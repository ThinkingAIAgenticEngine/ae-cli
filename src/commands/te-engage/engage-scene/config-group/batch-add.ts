import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Batch-creates config groups. */
export const configGroupBatchAdd = createEngageSceneCapabilityCommand({
  resource: 'config-group',
  command: 'batch-add',
  capabilityId: 'engage-scene.config-group.batch-add',
  description: 'Batch-create config groups.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'group-names', type: 'json', required: true, desc: 'JSON array of group names to create (<=80 chars each).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    group_names: ctx.json('group-names'),
  }),
});
