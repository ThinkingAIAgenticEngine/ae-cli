import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Sends a test message for a config strategy. */
export const strategyTestSend = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'test-send',
  capabilityId: 'engage-scene.strategy.test-send',
  description: 'Send a test message for a config strategy from a ConfigStrategySendTestDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'ConfigStrategySendTestDTO JSON body (strategyUuid, channelId, pushId, contentList, ...).',
    },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
