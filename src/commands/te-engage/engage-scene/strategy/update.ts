import { createEngageSceneCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';
import { validateEmbeddedSemanticDefinitions } from '../../semantic-qp-validation.js';

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
      desc: 'ConfigStrategyModifyDTO JSON body including strategyUuid. Custom audiences use definitionRequest.',
    },
  ],
  risk: 'write',
  validate: (ctx) => {
    const payload = readRequiredJsonObject(ctx, 'payload');
    validateEmbeddedSemanticDefinitions(payload, '--payload');
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: readRequiredJsonObject(ctx, 'payload'),
  }),
});
