import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Batch-deletes config item params by id. */
export const configParamBatchDelete = createEngageSceneCapabilityCommand({
  resource: 'config-param',
  command: 'batch-delete',
  capabilityId: 'engage-scene.config-param.batch-delete',
  description: 'Batch-delete config item params by id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'param-ids', type: 'json', required: true, desc: 'JSON array of param IDs to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    param_ids: ctx.json('param-ids'),
  }),
});
