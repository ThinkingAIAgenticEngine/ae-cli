import { createEngageSceneCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';
import { validateEmbeddedSemanticDefinitions } from '../../semantic-qp-validation.js';

/** Saves a config strategy and submits it for approval. */
export const strategySaveSubmit = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'save-submit',
  capabilityId: 'engage-scene.strategy.save-submit',
  description: 'Save a config strategy and submit it for approval from a ConfigStrategySaveAndSubmitDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ConfigStrategySaveAndSubmitDTO JSON body. Custom audiences use definitionRequest.',
    },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => {
    const payload = readRequiredJsonObject(ctx, 'payload');
    validateEmbeddedSemanticDefinitions(payload, '--payload');
  },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: readRequiredJsonObject(ctx, 'payload'),
  }),
});
