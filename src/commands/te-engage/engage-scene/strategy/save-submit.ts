import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Saves a config strategy and submits it for approval. */
export const strategySaveSubmit = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'save-submit',
  capabilityId: 'engage-scene.strategy.save-submit',
  description: 'Save a config strategy and submit it for approval from a ConfigStrategySaveAndSubmitDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'payload', type: 'json', required: true, desc: 'ConfigStrategySaveAndSubmitDTO JSON body.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
