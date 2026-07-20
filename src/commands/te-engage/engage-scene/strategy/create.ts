import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Creates a config strategy (draft). */
export const strategyCreate = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'create',
  capabilityId: 'engage-scene.strategy.create',
  description: 'Create a config strategy (draft) from a ConfigStrategyAddDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ConfigStrategyAddDTO JSON body (configId, templateId, strategyName, templateParamConfig, ...).',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
