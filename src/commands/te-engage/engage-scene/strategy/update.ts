import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Updates a config strategy. */
export const strategyUpdate = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'update',
  capabilityId: 'engage-scene.strategy.update',
  description: 'Update a config strategy from a ConfigStrategyModifyDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ConfigStrategyModifyDTO JSON body (strategyUuid + fields to modify).',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
